import { Database } from "bun:sqlite";
import { createHash } from "node:crypto";
import { existsSync } from "node:fs";
import {
  readFile,
  writeFile,
  unlink,
  mkdir,
  stat,
  rename,
  copyFile,
} from "node:fs/promises";
import path from "node:path";

import { logWarn, logDebug } from "../shared/logger.js";

/**
 * Content-addressed two-stage render cache.
 *
 * Stage A (compile: TSX+props -> node tree/stylesheets) is process-local,
 * in-memory only. It is cheap to recompute and not worth persisting or
 * sharing across processes.
 *
 * Stage B (render: node tree -> pixels) is the expensive step and is
 * persisted to disk, with metadata in SQLite so that concurrent processes
 * (e.g. `studio dev` and a background `studio render` batch job running at
 * the same time, which is an explicitly supported workflow) can read and
 * write the cache safely without clobbering each other.
 */

export interface StageAKeyInput {
  templateId: string;
  templateContentHash: string;
  propsJSON: string;
}

export interface StageBKeyInput {
  templateContentHash: string;
  propsJSON: string;
  width: number;
  height: number;
  format?: string;
}

export interface CacheStats {
  stageA: { entries: number };
  stageB: { entries: number; sizeBytes: number; maxSizeBytes: number };
  cacheDir: string;
}

export interface RenderCacheOptions {
  cacheDir?: string;
  maxSizeMB?: number;
  /** Max in-memory Stage A entries to retain. Default 100. */
  stageAMaxEntries?: number;
}

interface StageBRow {
  hash: string;
  file_name: string;
  created_at: number;
  last_accessed_at: number;
  size_bytes: number;
  width: number;
  height: number;
}

const DEFAULT_STAGE_A_MAX = 100;
const DEFAULT_MAX_SIZE_MB = 500;
const BUSY_TIMEOUT_MS = 5000;

export class RenderCache {
  private readonly cacheDir: string;
  private readonly maxSizeBytes: number;
  private readonly stageAMaxEntries: number;
  private readonly dbPath: string;

  private db: Database | undefined;
  private initialized = false;

  // Stage A: in-process only, never persisted, never shared across processes.
  private readonly stageACache = new Map<string, unknown>();
  private readonly stageAOrder: string[] = [];
  private readonly contentHashIndex = new Map<string, Set<string>>();

  constructor(options?: RenderCacheOptions) {
    this.cacheDir = options?.cacheDir ?? ".studio-cache";
    this.maxSizeBytes =
      (options?.maxSizeMB ?? DEFAULT_MAX_SIZE_MB) * 1024 * 1024;
    this.stageAMaxEntries = options?.stageAMaxEntries ?? DEFAULT_STAGE_A_MAX;
    this.dbPath = path.join(this.cacheDir, "cache.sqlite");
  }

  async init(): Promise<void> {
    if (this.initialized) {
      return;
    }

    if (!existsSync(this.cacheDir)) {
      await mkdir(this.cacheDir, { recursive: true });
    }

    const db = new Database(this.dbPath, { create: true, readwrite: true });

    // WAL mode is what makes concurrent multi-process access safe and fast:
    // readers don't block writers, writers don't block readers.
    db.run("PRAGMA journal_mode = WAL");
    db.run("PRAGMA synchronous = NORMAL");
    db.run(`PRAGMA busy_timeout = ${BUSY_TIMEOUT_MS}`);

    db.run(`
      CREATE TABLE IF NOT EXISTS stage_b_entries (
        hash TEXT PRIMARY KEY,
        file_name TEXT NOT NULL,
        created_at INTEGER NOT NULL,
        last_accessed_at INTEGER NOT NULL,
        size_bytes INTEGER NOT NULL,
        width INTEGER NOT NULL,
        height INTEGER NOT NULL
      )
    `);
    db.run(`
      CREATE INDEX IF NOT EXISTS idx_last_accessed
        ON stage_b_entries (last_accessed_at)
    `);

    this.db = db;
    this.initialized = true;
  }

  close(): void {
    this.db?.close();
    this.initialized = false;
  }

  // ---------------------------------------------------------------------
  // Stage A: compile cache. In-memory, per-process, insertion-order LRU.
  // ---------------------------------------------------------------------

  static createStageAKey(input: StageAKeyInput): string {
    return createHash("sha256")
      .update(
        `${input.templateId}\u0000${input.templateContentHash}\u0000${input.propsJSON}`
      )
      .digest("hex")
      .slice(0, 16);
  }

  getStageA(key: string): unknown {
    return this.stageACache.get(key) ?? null;
  }

  setStageA(key: string, value: unknown): void {
    if (!this.stageACache.has(key)) {
      this.stageAOrder.push(key);
    }
    this.stageACache.set(key, value);

    while (this.stageAOrder.length > this.stageAMaxEntries) {
      const oldest = this.stageAOrder.shift();
      if (oldest !== undefined) {
        this.stageACache.delete(oldest);
      }
    }
  }

  /**
   * Use this instead of setStageA when the entry should be invalidatable
   * by template content hash later (the normal case for template compile
   * results).
   */
  setStageAWithContentHash(
    key: string,
    contentHash: string,
    value: unknown
  ): void {
    this.setStageA(key, value);
    let set = this.contentHashIndex.get(contentHash);
    if (!set) {
      set = new Set();
      this.contentHashIndex.set(contentHash, set);
    }
    set.add(key);
  }

  /**
   * Invalidate Stage A entries previously written via
   * setStageAWithContentHash for a given content hash. Uses the explicit
   * index built at write time, not a hash-prefix guess against the cache
   * key itself (the key is a one-way hash, it cannot be pattern-matched
   * against its own input).
   */
  invalidateStageAByContentHash(contentHash: string): void {
    const keys = this.contentHashIndex.get(contentHash);
    if (!keys) {
      return;
    }

    for (const key of keys) {
      this.stageACache.delete(key);
      const idx = this.stageAOrder.indexOf(key);
      if (idx !== -1) {
        this.stageAOrder.splice(idx, 1);
      }
    }
    this.contentHashIndex.delete(contentHash);
  }

  clearStageA(): void {
    this.stageACache.clear();
    this.stageAOrder.length = 0;
    this.contentHashIndex.clear();
  }

  // ---------------------------------------------------------------------
  // Stage B: render cache. SQLite-backed metadata, files on disk, safe
  // across concurrent processes.
  // ---------------------------------------------------------------------

  static createStageBKey(input: StageBKeyInput): string {
    return createHash("sha256")
      .update(
        `${input.templateContentHash}\u0000${
          input.propsJSON
        }\u0000${input.width}x${input.height}\u0000${input.format ?? "png"}`
      )
      .digest("hex")
      .slice(0, 32);
  }

  async getStageB(key: string): Promise<Buffer | null> {
    const db = this.requireDb();

    const row = db
      .query<StageBRow, [string]>(
        "SELECT * FROM stage_b_entries WHERE hash = ?"
      )
      .get(key);
    if (!row) {
      return null;
    }

    const filePath = path.join(this.cacheDir, row.file_name);

    if (!existsSync(filePath)) {
      // Entry points at a file that's gone (manually deleted, disk issue) --
      // self-heal by removing the stale row.
      db.run("DELETE FROM stage_b_entries WHERE hash = ?", [key]);
      return null;
    }

    const fileStat = await stat(filePath);
    if (fileStat.size !== row.size_bytes) {
      // Size mismatch implies a partial/corrupt write (e.g. disk full
      // mid-write in a previous process). Don't trust it.
      db.run("DELETE FROM stage_b_entries WHERE hash = ?", [key]);
      await RenderCache.tryUnlink(filePath);
      return null;
    }

    db.run("UPDATE stage_b_entries SET last_accessed_at = ? WHERE hash = ?", [
      Date.now(),
      key,
    ]);

    return readFile(filePath);
  }

  async setStageB(
    key: string,
    bytes: Buffer,
    width: number,
    height: number,
    format = "png"
  ): Promise<string> {
    const db = this.requireDb();

    const fileName = `${key}.${format}`;
    const filePath = path.join(this.cacheDir, fileName);
    const now = Date.now();

    // Write to a temp file and rename, so a crash mid-write never leaves a
    // file at the final path that the DB thinks is valid but is actually
    // truncated.
    const tmpPath = `${filePath}.tmp-${process.pid}-${now}`;
    await writeFile(tmpPath, bytes);
    await RenderCache.atomicRename(tmpPath, filePath);

    const existing = db
      .query<Pick<StageBRow, "created_at">, [string]>(
        "SELECT created_at FROM stage_b_entries WHERE hash = ?"
      )
      .get(key);

    db.run(
      `INSERT INTO stage_b_entries
         (hash, file_name, created_at, last_accessed_at, size_bytes, width, height)
       VALUES (?, ?, ?, ?, ?, ?, ?)
       ON CONFLICT(hash) DO UPDATE SET
         last_accessed_at = excluded.last_accessed_at,
         size_bytes = excluded.size_bytes,
         width = excluded.width,
         height = excluded.height`,
      [
        key,
        fileName,
        existing?.created_at ?? now,
        now,
        bytes.length,
        width,
        height,
      ]
    );

    await this.evictIfNeeded();

    return filePath;
  }

  stats(): CacheStats {
    const db = this.requireDb();

    const totalRow = db
      .query<{ total: number }, []>(
        "SELECT COALESCE(SUM(size_bytes), 0) AS total FROM stage_b_entries"
      )
      .get();
    const countRow = db
      .query<{ n: number }, []>("SELECT COUNT(*) AS n FROM stage_b_entries")
      .get();

    return {
      cacheDir: this.cacheDir,
      stageA: { entries: this.stageACache.size },
      stageB: {
        entries: countRow?.n ?? 0,
        maxSizeBytes: this.maxSizeBytes,
        sizeBytes: totalRow?.total ?? 0,
      },
    };
  }

  async clean(): Promise<{ freedBytes: number }> {
    const db = this.requireDb();

    const rows = db
      .query<StageBRow, []>(
        "SELECT * FROM stage_b_entries ORDER BY last_accessed_at ASC"
      )
      .all();

    // Independent deletions (different files, no shared running total to
    // coordinate) -- safe and faster to parallelize, unlike evictIfNeeded
    // below.
    const freedAmounts = await Promise.all(
      rows.map((row) => this.deleteEntryFile(row))
    );
    const freedBytes = freedAmounts.reduce((sum, n) => sum + n, 0);

    db.run("DELETE FROM stage_b_entries");
    this.clearStageA();

    return { freedBytes };
  }

  private async evictIfNeeded(): Promise<void> {
    const db = this.requireDb();

    const totalRow = db
      .query<{ total: number }, []>(
        "SELECT COALESCE(SUM(size_bytes), 0) AS total FROM stage_b_entries"
      )
      .get();
    const remaining = totalRow?.total ?? 0;

    if (remaining <= this.maxSizeBytes) {
      return;
    }

    const rows = db
      .query<StageBRow, []>(
        "SELECT * FROM stage_b_entries ORDER BY last_accessed_at ASC"
      )
      .all();

    // Eviction is intentionally sequential, not Promise.all-parallelized:
    // each iteration's stop condition ("are we under budget yet") depends
    // on the running total from prior deletions in this same loop, so
    // these iterations are not independent the way clean()'s
    // delete-everything loop is.
    await this.deleteSequentiallyUntilUnderBudget(rows, remaining);
  }

  private async deleteSequentiallyUntilUnderBudget(
    rows: StageBRow[],
    startingTotal: number
  ): Promise<void> {
    let remaining = startingTotal;

    for (const row of rows) {
      if (remaining <= this.maxSizeBytes) {
        return;
      }
      remaining -= row.size_bytes;
      // oxlint-disable-next-line no-await-in-loop
      await this.deleteEntryFile(row);
    }
  }

  private async deleteEntryFile(row: StageBRow): Promise<number> {
    const db = this.requireDb();
    const filePath = path.join(this.cacheDir, row.file_name);
    let freed = 0;

    if (existsSync(filePath)) {
      try {
        const fileStat = await stat(filePath);
        freed = fileStat.size;
        await unlink(filePath);
      } catch (error) {
        logWarn("Failed to delete cache entry file during cleanup", {
          error: String(error),
          hash: row.hash,
        });
        freed = row.size_bytes;
      }
    }

    db.run("DELETE FROM stage_b_entries WHERE hash = ?", [row.hash]);
    return freed;
  }

  private static async tryUnlink(filePath: string): Promise<void> {
    try {
      await unlink(filePath);
    } catch (error) {
      logWarn("Failed to clean up cache file", {
        error: String(error),
        filePath,
      });
    }
  }

  private static async atomicRename(from: string, to: string): Promise<void> {
    try {
      await rename(from, to);
    } catch (error) {
      logDebug("Cross-device rename detected, falling back to copy+unlink", {
        error: String(error),
        from,
        to,
      });
      await copyFile(from, to);
      await unlink(from);
    }
  }

  private requireDb(): Database {
    if (!this.db || !this.initialized) {
      throw new Error("RenderCache.init() must be called before use.");
    }
    return this.db;
  }
}
