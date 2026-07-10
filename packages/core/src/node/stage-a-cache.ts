/**
 * Stage A: in-memory compile-result cache.
 *
 * Process-local only, never persisted, never shared across processes.
 * Cheap to recompute, so this is a pure insertion-order LRU with no
 * durability concerns -- extracted from the old monolithic RenderCache
 * with no behavior change, just decoupled from Stage B's disk/SQLite
 * concerns.
 */

const DEFAULT_STAGE_A_MAX = 100;

export class StageACache {
  private readonly maxEntries: number;

  private readonly cache = new Map<string, unknown>();
  private readonly order: string[] = [];
  private readonly contentHashIndex = new Map<string, Set<string>>();

  constructor(maxEntries: number = DEFAULT_STAGE_A_MAX) {
    this.maxEntries = maxEntries;
  }

  get size(): number {
    return this.cache.size;
  }

  get(key: string): unknown {
    return this.cache.get(key) ?? null;
  }

  set(key: string, value: unknown): void {
    if (!this.cache.has(key)) {
      this.order.push(key);
    }
    this.cache.set(key, value);

    while (this.order.length > this.maxEntries) {
      const oldest = this.order.shift();
      if (oldest !== undefined) {
        this.cache.delete(oldest);
      }
    }
  }

  /**
   * Use this instead of `set` when the entry should be invalidatable by
   * template content hash later (the normal case for template compile
   * results).
   */
  setWithContentHash(key: string, contentHash: string, value: unknown): void {
    this.set(key, value);
    let set = this.contentHashIndex.get(contentHash);
    if (!set) {
      set = new Set();
      this.contentHashIndex.set(contentHash, set);
    }
    set.add(key);
  }

  /**
   * Invalidate entries previously written via `setWithContentHash` for a
   * given content hash. Uses the explicit index built at write time, not
   * a hash-prefix guess against the cache key itself (the key is a
   * one-way hash, it cannot be pattern-matched against its own input).
   */
  invalidateByContentHash(contentHash: string): void {
    const keys = this.contentHashIndex.get(contentHash);
    if (!keys) {
      return;
    }

    for (const key of keys) {
      this.cache.delete(key);
      const idx = this.order.indexOf(key);
      if (idx !== -1) {
        this.order.splice(idx, 1);
      }
    }
    this.contentHashIndex.delete(contentHash);
  }

  clear(): void {
    this.cache.clear();
    this.order.length = 0;
    this.contentHashIndex.clear();
  }
}
