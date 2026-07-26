import { existsSync } from "node:fs";
import { mkdir, readdir } from "node:fs/promises";
import path from "node:path";

import { logDebug, logWarn } from "../shared/logger.js";
import { createCompileCacheKey, createPixelCacheKey } from "./cache-keys.js";
import { CompileCache } from "./compile-cache.js";
import { ConcurrencyLimiter } from "./concurrency-limiter.js";
import { EvictionCoordinator } from "./eviction-coordinator.js";
import { FsStore } from "./fs-store.js";
import { MetadataStore } from "./metadata-store.js";

export interface CacheStats {
  compiled: { entries: number };
  pixels: { entries: number; sizeBytes: number; maxSizeBytes: number };
  cacheDir: string;
}

export interface RenderCacheOptions {
  cacheDir?: string;
  maxSizeMB?: number;
  /** Max in-memory compiled entries to retain. Default 100. */
  compiledMaxEntries?: number;
  /** Caps concurrent Pixel cache disk writes/reads. Default: unbounded (matches pre-split behavior). */
  maxConcurrentWrites?: number;
  /** Debounce window between a write and the next eviction check. Default 250ms. */
  evictionDebounceMs?: number;
}

interface SweepOutcome {
  freedBytes: number;
}

const DEFAULT_MAX_SIZE_MB = 500;

/**
 * Minimum gap between two metadata recovery operations. Prevents a burst
 * of concurrent reads all triggering their own recoverMetadata() calls
 * under a transient SQLite busy condition.
 */
const RECOVERY_COOLDOWN_MS = 2000;

/**
 * Returns true for files that look like pixel cache entries:
 * a hex string followed by a dot and a format extension.
 * Excludes SQLite files (cache.sqlite, cache.sqlite-wal, cache.sqlite-shm)
 * and any other non-cache files.
 */
const isCacheEntryFileName = (name: string): boolean =>
  /^[0-9a-f]{32,}\.[a-z]+$/u.test(name);

/**
 * Content-addressed two-stage render cache — coordinator.
 *
 * FIX (recoverMetadata mutex): concurrent calls that both hit a SQLite
 * error used to each close and replace this.metadata independently,
 * with the second close() tearing down the store the first recovery just
 * opened. Recovery now serializes behind a single promise so only one
 * recovery runs at a time.
 *
 * FIX (recovery cooldown): recovery was triggered on every touchAccess
 * failure with no rate-limiting. Under sustained SQLite busy conditions
 * this caused a full MetadataStore re-open on every cache hit. Recovery
 * is now skipped if one completed within the last RECOVERY_COOLDOWN_MS.
 *
 * FIX (ENOENT during writeAtomic on a live dev-server): write-file-atomic
 * writes to a temp path in the same directory as the target, then renames.
 * If the cache directory is deleted mid-session the temp-file open fails
 * with ENOENT on a path like "<key>.png.1106080564" — not the final path.
 * The old code recreated the directory and retried, but only caught ENOENT
 * on the final path. Now the directory is always re-ensured before the
 * retry regardless of which path triggered the ENOENT.
 *
 * FIX (orphaned files): the partial sweep was file-delete then row-delete,
 * not atomic. A crash between those two steps left rows with no backing
 * file. The full sweep now also scans the directory for files with no
 * metadata row and removes them.
 */
export class RenderCache {
  private readonly cacheDir: string;
  private readonly maxSizeBytes: number;
  private readonly compiled: CompileCache;
  private readonly maxConcurrentWrites: number | undefined;
  private readonly evictionDebounceMs: number | undefined;

  private metadata: MetadataStore | undefined;
  private fsStore: FsStore | undefined;
  private eviction: EvictionCoordinator | undefined;
  private initialized = false;

  // serialize concurrent recovery calls
  private recoveryPromise: Promise<void> | null = null;
  // cooldown to avoid re-opening on every busy-error hit
  private lastRecoveryAt = 0;

  static readonly createCompileCacheKey = createCompileCacheKey;
  static readonly createPixelCacheKey = createPixelCacheKey;

  constructor(options?: RenderCacheOptions) {
    this.cacheDir = options?.cacheDir ?? ".studio-cache";
    this.maxSizeBytes =
      (options?.maxSizeMB ?? DEFAULT_MAX_SIZE_MB) * 1024 * 1024;
    this.compiled = new CompileCache(options?.compiledMaxEntries);
    this.maxConcurrentWrites = options?.maxConcurrentWrites;
    this.evictionDebounceMs = options?.evictionDebounceMs;
  }

  async init(): Promise<void> {
    if (this.initialized) {
      return;
    }

    if (!existsSync(this.cacheDir)) {
      await mkdir(this.cacheDir, { recursive: true });
    }

    this.metadata = new MetadataStore(this.cacheDir);
    await this.metadata.init();

    const limiter = new ConcurrencyLimiter(this.maxConcurrentWrites);
    this.fsStore = new FsStore(limiter);

    this.eviction = new EvictionCoordinator({
      debounceMs: this.evictionDebounceMs,
      getCurrentTotalBytes: async () => {
        const totals = await this.requireMetadata().getTotals();
        return totals.totalSizeBytes;
      },
      lockTargetPath: this.cacheDir,
      maxSizeBytes: this.maxSizeBytes,
      sweep: (options) => this.performSweep(options),
    });

    this.initialized = true;
  }

  close(): void {
    this.eviction?.cancelPending();
    this.metadata?.close();
    this.initialized = false;
  }

  // ---------------------------------------------------------------------
  // Compile cache: delegated to CompileCache.
  // ---------------------------------------------------------------------

  getCompiled(key: string): unknown {
    return this.compiled.get(key);
  }

  setCompiled(key: string, value: unknown): void {
    this.compiled.set(key, value);
  }

  setCompiledWithContentHash(
    key: string,
    contentHash: string,
    value: unknown
  ): void {
    this.compiled.setWithContentHash(key, contentHash, value);
  }

  invalidateCompiledByContentHash(contentHash: string): void {
    this.compiled.invalidateByContentHash(contentHash);
  }

  clearCompiled(): void {
    this.compiled.clear();
  }

  // ---------------------------------------------------------------------
  // Pixel cache
  // ---------------------------------------------------------------------

  async getPixels(key: string): Promise<Buffer | null> {
    const metadata = this.requireMetadata();
    const fsStore = this.requireFsStore();

    let row;
    try {
      row = await metadata.getEntry(key);
    } catch (error: unknown) {
      logWarn("Pixel metadata read failed, attempting recovery", {
        error: error instanceof Error ? error.message : String(error),
        key,
      });
      await this.recoverMetadata();
      return null;
    }

    if (!row) {
      return null;
    }

    const filePath = path.join(this.cacheDir, row.fileName);
    const bytes = await fsStore.readVerified(
      filePath,
      row.sizeBytes,
      row.contentHash
    );

    if (bytes === null) {
      // File is missing, truncated, or content-corrupted — self-heal by
      // forgetting the stale row.
      try {
        await metadata.deleteEntry(key);
      } catch {
        // best-effort cleanup
      }
      return null;
    }

    try {
      await metadata.touchAccess(key);
    } catch (error: unknown) {
      logWarn("Pixel touchAccess failed, attempting recovery", {
        error: error instanceof Error ? error.message : String(error),
        key,
      });
      // guarded by cooldown + mutex so concurrent failures don't each
      // close and re-open the store independently.
      await this.recoverMetadata();
      // Bytes were already read successfully — return them.
    }
    return bytes;
  }

  async setPixels(
    key: string,
    bytes: Buffer,
    width: number,
    height: number,
    format = "png"
  ): Promise<string> {
    let metadata = this.requireMetadata();
    const fsStore = this.requireFsStore();

    const fileName = `${key}.${format}`;
    const filePath = path.join(this.cacheDir, fileName);
    const contentHash = fsStore.computeHash(bytes);

    // (dev-server ENOENT): write-file-atomic writes to a temp file in
    // the same directory as the target (e.g. "<key>.png.1106080564") before
    // renaming. If the cache directory was deleted mid-session the temp-file
    // open throws ENOENT on the temp path — not `filePath`. The old code
    // caught this correctly but the fix is to always re-create the directory
    // and retry unconditionally when ANY ENOENT comes from writeAtomic,
    // regardless of which path triggered it.
    try {
      await fsStore.writeAtomic(filePath, bytes);
    } catch (error: unknown) {
      if ((error as NodeJS.ErrnoException)?.code === "ENOENT") {
        logDebug(
          "FsStore: ENOENT during writeAtomic, recreating cache directory and retrying",
          { filePath }
        );
        await mkdir(this.cacheDir, { recursive: true });
        // Retry — if it fails again it's a real error.
        await fsStore.writeAtomic(filePath, bytes);
      } else {
        throw error;
      }
    }

    try {
      await metadata.upsertEntry({
        contentHash,
        fileName,
        hash: key,
        height,
        sizeBytes: bytes.length,
        width,
      });
    } catch (error: unknown) {
      const err = error as { code?: string; message?: string };
      if (
        err?.code === "SQLITE_IOERR_VNODE" ||
        (err?.message ?? "").includes("disk I/O error")
      ) {
        logWarn("Metadata write failed (I/O error), recovering and retrying", {
          error: String(error),
          key,
        });
        await this.recoverMetadata();
        metadata = this.requireMetadata();
        await metadata.upsertEntry({
          contentHash,
          fileName,
          hash: key,
          height,
          sizeBytes: bytes.length,
          width,
        });
      } else {
        throw error;
      }
    }
    this.requireEviction().requestEviction();

    return filePath;
  }

  async stats(): Promise<CacheStats> {
    const totals = await this.requireMetadata().getTotals();
    return {
      cacheDir: this.cacheDir,
      compiled: { entries: this.compiled.size },
      pixels: {
        entries: totals.entryCount,
        maxSizeBytes: this.maxSizeBytes,
        sizeBytes: totals.totalSizeBytes,
      },
    };
  }

  /** Full wipe — always removes everything, still lock-coordinated. */
  clean(): Promise<SweepOutcome> {
    this.compiled.clear();
    return this.requireEviction().runFullSweep();
  }

  private async performSweep(options: {
    full: boolean;
  }): Promise<SweepOutcome> {
    const metadata = this.requireMetadata();
    const fsStore = this.requireFsStore();

    if (options.full) {
      const rows = await metadata.listAllOrderedByLastAccessed();

      // Delete all tracked files
      const freedAmounts = await Promise.all(
        rows.map((row) =>
          fsStore.delete(path.join(this.cacheDir, row.fileName), row.sizeBytes)
        )
      );
      await metadata.deleteAll();

      // reconcile orphaned files — files in the cache directory that
      // have no metadata row (e.g. left over from a crash mid-sweep).
      const orphanFreed = await this.deleteOrphanFiles(
        new Set(rows.map((r) => r.fileName)),
        fsStore
      );

      return {
        freedBytes: freedAmounts.reduce((sum, n) => sum + n, 0) + orphanFreed,
      };
    }

    // Partial sweep: evict oldest entries until within budget.
    // re-read totals inside the lock (called from within runSweep
    // which already holds the lock) to avoid acting on a stale size that
    // another process already swept away.
    const totals = await metadata.getTotals();
    if (totals.totalSizeBytes <= this.maxSizeBytes) {
      return { freedBytes: 0 };
    }

    const rows = await metadata.listAllOrderedByLastAccessed();
    let remaining = totals.totalSizeBytes;

    const rowsToEvict: typeof rows = [];
    for (const row of rows) {
      if (remaining <= this.maxSizeBytes) {
        break;
      }
      rowsToEvict.push(row);
      remaining -= row.sizeBytes;
    }

    // FIX (partial atomicity): delete the file first, then the row. A crash
    // between these two leaves a row with no file — the getPixels self-heal
    // path handles that on next read. The inverse (row deleted, file not)
    // would leave an orphan file; the full sweep reconciliation cleans those.
    // This order is safer because the metadata row is the source of truth:
    // a dangling row causes a cache miss + self-heal; a dangling file is
    // silent disk waste reclaimed at the next full sweep.
    const freedAmounts = await Promise.all(
      rowsToEvict.map(async (row) => {
        const freedForRow = await fsStore.delete(
          path.join(this.cacheDir, row.fileName),
          row.sizeBytes
        );
        await metadata.deleteEntry(row.hash);
        return freedForRow;
      })
    );

    return { freedBytes: freedAmounts.reduce((sum, n) => sum + n, 0) };
  }

  /**
   * scan the cache directory for files not tracked in metadata and
   * delete them. These are orphans from a crash mid-sweep (file written,
   * row not yet inserted) or a partial eviction (file deleted before row).
   *
   * Only removes files that look like cache entries (matching the
   * "<key>.<format>" naming pattern), not metadata files like cache.sqlite.
   */
  private async deleteOrphanFiles(
    knownFileNames: Set<string>,
    fsStore: FsStore
  ): Promise<number> {
    let freed = 0;
    try {
      const entries = await readdir(this.cacheDir);
      await Promise.all(
        entries.map(async (entry) => {
          // Only consider hex-named image files (cache entries).
          // SQLite files, WAL, SHM, and other metadata are excluded.
          if (knownFileNames.has(entry) || !isCacheEntryFileName(entry)) {
            return;
          }
          const filePath = path.join(this.cacheDir, entry);
          logDebug("FsStore: removing orphaned cache file", { filePath });
          freed += await fsStore.delete(filePath);
        })
      );
    } catch (error) {
      logWarn("RenderCache: failed to scan for orphaned files", {
        error: String(error),
      });
    }
    return freed;
  }

  // ------------------------------------------------------------------
  // Metadata recovery — mutex + cooldown
  // ------------------------------------------------------------------

  /**
   * previous implementation had no concurrency guard. Two concurrent
   * callers both hitting a SQLite error would each call close() + init()
   * independently; the second close() would tear down the MetadataStore
   * the first recovery just opened, leaving the cache in a broken state.
   *
   * Now: all concurrent recovery attempts share a single promise. The
   * first caller does the actual work; subsequent ones just await the same
   * promise. A cooldown prevents re-opening on every busy-error hit under
   * sustained load.
   */
  private async recoverMetadata(): Promise<void> {
    const now = Date.now();
    if (now - this.lastRecoveryAt < RECOVERY_COOLDOWN_MS) {
      logDebug("RenderCache: skipping recovery — within cooldown window", {
        cooldownMs: RECOVERY_COOLDOWN_MS,
      });
      return;
    }

    if (this.recoveryPromise) {
      return this.recoveryPromise;
    }

    this.recoveryPromise = this.doRecoverMetadata();
    try {
      await this.recoveryPromise;
    } finally {
      this.recoveryPromise = null;
    }
  }

  private async doRecoverMetadata(): Promise<void> {
    this.lastRecoveryAt = Date.now();
    this.metadata?.close();
    this.metadata = new MetadataStore(this.cacheDir);
    await this.metadata.init();
  }

  // ------------------------------------------------------------------
  // Guards
  // ------------------------------------------------------------------

  private requireMetadata(): MetadataStore {
    if (!this.metadata) {
      throw new Error("RenderCache.init() must be called before use.");
    }
    return this.metadata;
  }

  private requireFsStore(): FsStore {
    if (!this.fsStore) {
      throw new Error("RenderCache.init() must be called before use.");
    }
    return this.fsStore;
  }

  private requireEviction(): EvictionCoordinator {
    if (!this.eviction) {
      throw new Error("RenderCache.init() must be called before use.");
    }
    return this.eviction;
  }
}
