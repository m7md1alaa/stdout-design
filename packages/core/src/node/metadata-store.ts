import { Database } from "bun:sqlite";
import { existsSync } from "node:fs";
import { mkdir } from "node:fs/promises";
import path from "node:path";

import { Kysely, sql } from "kysely";
import { BunSqliteDialect } from "kysely-bun-sqlite";

const BUSY_TIMEOUT_MS = 5000;

/** Kysely schema. Column names match the pre-split SQLite table exactly, plus one addition: `content_hash`, needed for FsStore's corruption check. */
export interface StageBEntriesTable {
  hash: string;
  file_name: string;
  created_at: number;
  last_accessed_at: number;
  size_bytes: number;
  width: number;
  height: number;
  content_hash: string;
}

/** Single-row counter table, maintained entirely by SQLite triggers -- never written to directly from application code, so it can't drift from the real row set after a crash mid-transaction. */
export interface CacheTotalsTable {
  id: number;
  total_size_bytes: number;
  entry_count: number;
}

interface DatabaseSchema {
  stage_b_entries: StageBEntriesTable;
  cache_totals: CacheTotalsTable;
}

export interface StageBEntryInput {
  hash: string;
  fileName: string;
  sizeBytes: number;
  width: number;
  height: number;
  contentHash: string;
}

export interface StageBEntryRow {
  hash: string;
  fileName: string;
  createdAt: number;
  lastAccessedAt: number;
  sizeBytes: number;
  width: number;
  height: number;
  contentHash: string;
}

export interface CacheTotals {
  totalSizeBytes: number;
  entryCount: number;
}

const toRow = (r: StageBEntriesTable): StageBEntryRow => ({
  contentHash: r.content_hash,
  createdAt: r.created_at,
  fileName: r.file_name,
  hash: r.hash,
  height: r.height,
  lastAccessedAt: r.last_accessed_at,
  sizeBytes: r.size_bytes,
  width: r.width,
});

/**
 * SQLite-backed metadata store for Stage B cache entries.
 *
 * Two things changed from the pre-split RenderCache:
 *
 * 1. Queries go through Kysely instead of hand-written SQL strings with
 *    positional parameter arrays (`db.run("...", [key, fileName, ...])`)
 *    -- a schema change that adds a column no longer risks a call site's
 *    array silently drifting out of sync; it's a compile error instead.
 *
 * 2. Total size/entry count are maintained by SQLite triggers into a
 *    single-row `cache_totals` table, updated in the same transaction as
 *    every insert/update/delete. Reading the current totals is an O(1)
 *    primary-key lookup instead of `SELECT SUM(size_bytes)` /
 *    `SELECT COUNT(*)` scanning the whole table on every write.
 */
export class MetadataStore {
  private readonly cacheDir: string;
  private readonly dbPath: string;
  private rawDb: Database | undefined;
  private db: Kysely<DatabaseSchema> | undefined;
  private initialized = false;

  constructor(cacheDir: string) {
    this.cacheDir = cacheDir;
    this.dbPath =
      cacheDir === ":memory:"
        ? ":memory:"
        : path.join(cacheDir, "cache.sqlite");
  }

  async init(): Promise<void> {
    if (this.initialized) {
      return;
    }

    if (this.cacheDir !== ":memory:" && !existsSync(this.cacheDir)) {
      await mkdir(this.cacheDir, { recursive: true });
    }

    const rawDb = new Database(this.dbPath, { create: true, readwrite: true });
    // WAL mode is what makes concurrent multi-process access safe and
    // fast: readers don't block writers, writers don't block readers.
    rawDb.run("PRAGMA journal_mode = WAL");
    rawDb.run("PRAGMA synchronous = NORMAL");
    rawDb.run(`PRAGMA busy_timeout = ${BUSY_TIMEOUT_MS}`);
    this.rawDb = rawDb;

    this.db = new Kysely<DatabaseSchema>({
      dialect: new BunSqliteDialect({ database: rawDb }),
    });

    await this.createSchema();
    this.initialized = true;
  }

  private async createSchema(): Promise<void> {
    const db = this.requireDb();

    await db.schema
      .createTable("stage_b_entries")
      .ifNotExists()
      .addColumn("hash", "text", (c) => c.primaryKey())
      .addColumn("file_name", "text", (c) => c.notNull())
      .addColumn("created_at", "integer", (c) => c.notNull())
      .addColumn("last_accessed_at", "integer", (c) => c.notNull())
      .addColumn("size_bytes", "integer", (c) => c.notNull())
      .addColumn("width", "integer", (c) => c.notNull())
      .addColumn("height", "integer", (c) => c.notNull())
      .addColumn("content_hash", "text", (c) => c.notNull())
      .execute();

    await db.schema
      .createIndex("idx_last_accessed")
      .ifNotExists()
      .on("stage_b_entries")
      .column("last_accessed_at")
      .execute();

    await db.schema
      .createTable("cache_totals")
      .ifNotExists()
      .addColumn("id", "integer", (c) => c.primaryKey())
      .addColumn("total_size_bytes", "integer", (c) => c.notNull().defaultTo(0))
      .addColumn("entry_count", "integer", (c) => c.notNull().defaultTo(0))
      .execute();

    await sql`INSERT OR IGNORE INTO cache_totals (id, total_size_bytes, entry_count) VALUES (1, 0, 0)`.execute(
      db
    );

    // Triggers, not application code, maintain the running total -- they
    // fire inside the same transaction as the row change, so the counter
    // cannot desync from the real row set even if the process crashes
    // mid-write (SQLite's own atomicity covers the trigger's UPDATE too).
    await sql`
      CREATE TRIGGER IF NOT EXISTS trg_stage_b_insert
      AFTER INSERT ON stage_b_entries
      BEGIN
        UPDATE cache_totals
        SET total_size_bytes = total_size_bytes + NEW.size_bytes,
            entry_count = entry_count + 1
        WHERE id = 1;
      END;
    `.execute(db);

    await sql`
      CREATE TRIGGER IF NOT EXISTS trg_stage_b_delete
      AFTER DELETE ON stage_b_entries
      BEGIN
        UPDATE cache_totals
        SET total_size_bytes = total_size_bytes - OLD.size_bytes,
            entry_count = entry_count - 1
        WHERE id = 1;
      END;
    `.execute(db);

    await sql`
      CREATE TRIGGER IF NOT EXISTS trg_stage_b_update_size
      AFTER UPDATE OF size_bytes ON stage_b_entries
      WHEN OLD.size_bytes != NEW.size_bytes
      BEGIN
        UPDATE cache_totals
        SET total_size_bytes = total_size_bytes - OLD.size_bytes + NEW.size_bytes
        WHERE id = 1;
      END;
    `.execute(db);
  }

  close(): void {
    this.rawDb?.close();
    this.initialized = false;
  }

  /** Insert a new entry, or update it in place (same behavior as the old ON CONFLICT DO UPDATE) if the hash already exists -- e.g. a re-render at a different size for the same key. */
  async upsertEntry(input: StageBEntryInput): Promise<void> {
    const db = this.requireDb();
    const now = Date.now();

    await db
      .insertInto("stage_b_entries")
      .values({
        content_hash: input.contentHash,
        created_at: now,
        file_name: input.fileName,
        hash: input.hash,
        height: input.height,
        last_accessed_at: now,
        size_bytes: input.sizeBytes,
        width: input.width,
      })
      .onConflict((oc) =>
        oc.column("hash").doUpdateSet({
          content_hash: input.contentHash,
          file_name: input.fileName,
          height: input.height,
          last_accessed_at: now,
          size_bytes: input.sizeBytes,
          width: input.width,
        })
      )
      .execute();
  }

  async getEntry(hash: string): Promise<StageBEntryRow | null> {
    const db = this.requireDb();
    const row = await db
      .selectFrom("stage_b_entries")
      .selectAll()
      .where("hash", "=", hash)
      .executeTakeFirst();
    return row ? toRow(row) : null;
  }

  async touchAccess(
    hash: string,
    timestamp: number = Date.now()
  ): Promise<void> {
    const db = this.requireDb();
    await db
      .updateTable("stage_b_entries")
      .set({ last_accessed_at: timestamp })
      .where("hash", "=", hash)
      .execute();
  }

  async deleteEntry(hash: string): Promise<void> {
    const db = this.requireDb();
    await db.deleteFrom("stage_b_entries").where("hash", "=", hash).execute();
  }

  async deleteAll(): Promise<void> {
    const db = this.requireDb();
    await db.deleteFrom("stage_b_entries").execute();
  }

  async listAllOrderedByLastAccessed(): Promise<StageBEntryRow[]> {
    const db = this.requireDb();
    const rows = await db
      .selectFrom("stage_b_entries")
      .selectAll()
      .orderBy("last_accessed_at", "asc")
      .execute();
    return rows.map(toRow);
  }

  /** O(1): reads the trigger-maintained single-row counter instead of scanning the table. */
  async getTotals(): Promise<CacheTotals> {
    const db = this.requireDb();
    const row = await db
      .selectFrom("cache_totals")
      .select(["total_size_bytes", "entry_count"])
      .where("id", "=", 1)
      .executeTakeFirstOrThrow();
    return {
      entryCount: row.entry_count,
      totalSizeBytes: row.total_size_bytes,
    };
  }

  private requireDb(): Kysely<DatabaseSchema> {
    if (!this.db) {
      throw new Error("MetadataStore.init() must be called before use.");
    }
    return this.db;
  }
}
