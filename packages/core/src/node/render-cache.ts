import { existsSync } from "node:fs";
import { mkdir } from "node:fs/promises";
import path from "node:path";

import { logWarn } from "../shared/logger.js";
import { createCompileCacheKey, createPixelCacheKey } from "./cache-keys.js";
import { CompileCache } from "./compile-cache.js";
import { ConcurrencyLimiter } from "./concurrency-limiter.js";
import { EvictionCoordinator } from "./eviction-coordinator.js";
import { FsStore } from "./fs-store.js";
import { MetadataStore } from "./metadata-store.js";

export type { CompileCacheKeyInput, PixelCacheKeyInput } from "./cache-keys.js";

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
 * Content-addressed two-stage render cache -- coordinator.
 *
 * This class used to own SQLite calls, filesystem calls, atomicity
 * handling, and eviction policy directly (~400 lines, five
 * responsibilities). It now owns none of that: it constructs and wires
 * together CompileCache, MetadataStore, FsStore, and EvictionCoordinator,
 * and exposes the exact same public method signatures CLI, MCP, and
 * dev-server already depend on. No downstream consumer needs to change
 * anything as a result of this refactor.
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
  // Pixel cache: coordinates MetadataStore (row) + FsStore (bytes), triggers
  // debounced eviction after every write.
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
      // FsStore already determined the file is missing, truncated, or
      // content-corrupted -- self-heal by forgetting the stale row.
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
      await this.recoverMetadata();
      // byte read still succeeded, so return the bytes
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
    const metadata = this.requireMetadata();
    const fsStore = this.requireFsStore();

    const fileName = `${key}.${format}`;
    const filePath = path.join(this.cacheDir, fileName);
    const contentHash = fsStore.computeHash(bytes);

    await fsStore.writeAtomic(filePath, bytes);
    await metadata.upsertEntry({
      contentHash,
      fileName,
      hash: key,
      height,
      sizeBytes: bytes.length,
      width,
    });

    // Debounced, lock-coordinated -- does not run the eviction scan
    // inline on the write's critical path.
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

  /** Full wipe -- unlike a budget-triggered sweep, always removes everything, still lock-coordinated. */
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
      const freedAmounts = await Promise.all(
        rows.map((row) =>
          fsStore.delete(path.join(this.cacheDir, row.fileName), row.sizeBytes)
        )
      );
      await metadata.deleteAll();
      return { freedBytes: freedAmounts.reduce((sum, n) => sum + n, 0) };
    }

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

  private requireMetadata(): MetadataStore {
    if (!this.metadata) {
      throw new Error("RenderCache.init() must be called before use.");
    }
    return this.metadata;
  }

  private async recoverMetadata(): Promise<void> {
    this.metadata?.close();
    this.metadata = new MetadataStore(this.cacheDir);
    await this.metadata.init();
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
