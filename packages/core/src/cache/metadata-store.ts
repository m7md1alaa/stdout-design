import { existsSync, unlinkSync } from "node:fs";
import { mkdir } from "node:fs/promises";
import path from "node:path";

import { Kysely, sql, SqliteDialect } from "kysely";

import { logWarn } from "../shared/logger.js";

const BUSY_TIMEOUT_MS = 5000;

/** Kysely schema. Column names match the pre-split SQLite table exactly, plus one addition: `content_hash`, needed for FsStore's corruption check. */
interface PixelCacheEntriesTable {
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
interface CacheTotalsTable {
  id: number;
  total_size_bytes: number;
  entry_count: number;
}

interface DatabaseSchema {
  pixel_cache_entries: PixelCacheEntriesTable;
  cache_totals: CacheTotalsTable;
}

export interface PixelCacheEntryInput {
  hash: string;
  fileName: string;
  sizeBytes: number;
  width: number;
  height: number;
  contentHash: string;
}

export interface PixelCacheEntryRow {
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

const toRow = (r: PixelCacheEntriesTable): PixelCacheEntryRow => ({
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
 * SQLite-backed metadata store for pixel cache entries.
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
  private closeDb: (() => void) | undefined;
  private db: Kysely<DatabaseSchema> | undefined;
  private initialized = false;
  private initPromise: Promise<void> | undefined;

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

    if (this.initPromise) {
      return this.initPromise;
    }

    this.initPromise = this.#doInit();
    try {
      await this.initPromise;
    } finally {
      this.initPromise = undefined;
      // Only mark initialized if close() wasn't called during init
      if (this.closeDb) {
        this.initialized = true;
      }
    }
  }

  async #doInit(): Promise<void> {
    if (this.cacheDir !== ":memory:" && !existsSync(this.cacheDir)) {
      await mkdir(this.cacheDir, { recursive: true });
    }

    let isBun = false;
    try {
      await import("bun:sqlite");
      isBun = true;
    } catch {
      isBun = false;
    }

    await (isBun ? this.initBun() : this.initNode());
  }

  private async initBun(): Promise<void> {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let Database: new (...args: any[]) => any;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let BunSqliteDialect: new (...args: any[]) => any;
    try {
      ({ Database } = await import("bun:sqlite"));
      ({ BunSqliteDialect } = await import("kysely-bun-sqlite"));
    } catch (error) {
      throw new Error(
        "Failed to load Bun SQLite modules. Ensure 'bun:sqlite' and 'kysely-bun-sqlite' are available.",
        { cause: error }
      );
    }

    const createDb = () =>
      new Database(this.dbPath, { create: true, readwrite: true });

    const rawDb = this.createAndVerifyDb(
      createDb,
      (db, statement) => db.run(statement),
      (db) => {
        const result = db.query("PRAGMA integrity_check").get() as {
          integrity_check: string;
        } | null;
        return result?.integrity_check ?? null;
      }
    );

    this.closeDb = () => {
      try {
        rawDb.run("PRAGMA wal_checkpoint(TRUNCATE)");
      } catch {
        // Best-effort — may fail if the DB file was deleted from under us
        // (e.g. a user deleted the cache directory). Still close the handle.
      }
      rawDb.close();
    };

    this.db = new Kysely<DatabaseSchema>({
      dialect: new BunSqliteDialect({ database: rawDb }),
    });

    await this.createSchema();
  }

  private async initNode(): Promise<void> {
    // oxlint-disable-next-line typescript/no-explicit-any
    let BetterSqlite3: new (...args: any[]) => any;
    try {
      const mod = await import("better-sqlite3");
      BetterSqlite3 = mod.default;
    } catch (error) {
      throw new Error(
        "Failed to load better-sqlite3. This is required when running under Node.js. " +
          "Install it as a dependency: `npm install better-sqlite3`.",
        { cause: error }
      );
    }

    const createDb = () => new BetterSqlite3(this.dbPath);

    const rawDb = this.createAndVerifyDb(
      createDb,
      (db, statement) => db.exec(statement),
      (db) => {
        const result = db.prepare("PRAGMA integrity_check").get() as
          | { integrity_check: string }
          | undefined;
        return result?.integrity_check ?? null;
      }
    );

    this.closeDb = () => {
      try {
        rawDb.exec("PRAGMA wal_checkpoint(TRUNCATE)");
      } catch {
        // Best-effort — may fail if the DB file was deleted from under us.
      }
      rawDb.close();
    };

    this.db = new Kysely<DatabaseSchema>({
      dialect: new SqliteDialect({ database: rawDb }),
    });

    await this.createSchema();
  }

  private createAndVerifyDb<T>(
    createFn: () => T,
    runFn: (db: T, sql: string) => void,
    checkFn: (db: T) => string | null
  ): T {
    const rawDb = createFn();

    let dbHealthy = true;
    try {
      runFn(rawDb, "PRAGMA journal_mode = WAL");
      runFn(rawDb, "PRAGMA synchronous = NORMAL");
      runFn(rawDb, `PRAGMA busy_timeout = ${BUSY_TIMEOUT_MS}`);
      runFn(rawDb, "PRAGMA wal_checkpoint(TRUNCATE)");

      const result = checkFn(rawDb);
      if (result !== "ok") {
        dbHealthy = false;
        logWarn("SQLite integrity check failed, recreating cache database", {
          result: result ?? "null",
        });
      }
    } catch {
      dbHealthy = false;
      logWarn(
        "SQLite setup or integrity check threw, recreating cache database"
      );
    }

    if (dbHealthy) {
      return rawDb;
    }

    // Native API to close — the generic type T isn't constrained to have
    // close(), but both bun:sqlite Database and better-sqlite3 Database do.
    (rawDb as { close: () => void }).close();
    this.deleteDatabaseFiles();

    const freshDb = createFn();
    runFn(freshDb, "PRAGMA journal_mode = WAL");
    runFn(freshDb, "PRAGMA synchronous = NORMAL");
    runFn(freshDb, `PRAGMA busy_timeout = ${BUSY_TIMEOUT_MS}`);
    return freshDb;
  }

  private async createSchema(): Promise<void> {
    const db = this.requireDb();

    await db.schema
      .createTable("pixel_cache_entries")
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
      .on("pixel_cache_entries")
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
      CREATE TRIGGER IF NOT EXISTS trg_pixel_cache_insert
      AFTER INSERT ON pixel_cache_entries
      BEGIN
        UPDATE cache_totals
        SET total_size_bytes = total_size_bytes + NEW.size_bytes,
            entry_count = entry_count + 1
        WHERE id = 1;
      END;
    `.execute(db);

    await sql`
      CREATE TRIGGER IF NOT EXISTS trg_pixel_cache_delete
      AFTER DELETE ON pixel_cache_entries
      BEGIN
        UPDATE cache_totals
        SET total_size_bytes = total_size_bytes - OLD.size_bytes,
            entry_count = entry_count - 1
        WHERE id = 1;
      END;
    `.execute(db);

    await sql`
      CREATE TRIGGER IF NOT EXISTS trg_pixel_cache_update_size
      AFTER UPDATE OF size_bytes ON pixel_cache_entries
      WHEN OLD.size_bytes != NEW.size_bytes
      BEGIN
        UPDATE cache_totals
        SET total_size_bytes = total_size_bytes - OLD.size_bytes + NEW.size_bytes
        WHERE id = 1;
      END;
    `.execute(db);
  }

  close(): void {
    if (this.closeDb) {
      this.closeDb();
      this.closeDb = undefined;
    }
    this.db = undefined;
    this.initialized = false;
    this.initPromise = undefined;
  }

  private deleteDatabaseFiles(): void {
    if (this.dbPath === ":memory:") {
      return;
    }
    for (const suffix of ["", "-wal", "-shm"]) {
      try {
        unlinkSync(`${this.dbPath}${suffix}`);
      } catch {
        // best-effort: file may not exist
      }
    }
  }

  /** Insert a new entry, or update it in place (same behavior as the old ON CONFLICT DO UPDATE) if the hash already exists -- e.g. a re-render at a different size for the same key. */
  async upsertEntry(input: PixelCacheEntryInput): Promise<void> {
    const db = this.requireDb();
    const now = Date.now();

    await db
      .insertInto("pixel_cache_entries")
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

  async getEntry(hash: string): Promise<PixelCacheEntryRow | null> {
    const db = this.requireDb();
    const row = await db
      .selectFrom("pixel_cache_entries")
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
      .updateTable("pixel_cache_entries")
      .set({ last_accessed_at: timestamp })
      .where("hash", "=", hash)
      .execute();
  }

  async deleteEntry(hash: string): Promise<void> {
    const db = this.requireDb();
    await db
      .deleteFrom("pixel_cache_entries")
      .where("hash", "=", hash)
      .execute();
  }

  async deleteAll(): Promise<void> {
    const db = this.requireDb();
    await db.deleteFrom("pixel_cache_entries").execute();
  }

  async listAllOrderedByLastAccessed(): Promise<PixelCacheEntryRow[]> {
    const db = this.requireDb();
    const rows = await db
      .selectFrom("pixel_cache_entries")
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
