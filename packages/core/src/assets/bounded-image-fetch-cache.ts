const DEFAULT_MAX_ENTRIES = 500;

/**
 * `Map`-like single-flight byte cache: `@takumi-rs/helpers`'s own
 * `ImageFetchCache` shape, restated here so callers don't need to import
 * from `@takumi-rs/helpers` just to construct or type one.
 */
export interface ImageFetchCacheLike {
  get: (url: string) => Promise<ArrayBuffer> | undefined;
  set: (url: string, data: Promise<ArrayBuffer>) => unknown;
  delete: (url: string) => unknown;
}

/**
 * Bounded, insertion-order LRU over a plain `Map`. `Map` iterates in
 * insertion order, so a hit promotes to most-recently-used by delete +
 * re-set, and eviction just drops the first (oldest) key once over
 * capacity -- both O(1) amortized, no linked list needed for this size of
 * cache. Exists because a plain unbounded `Map` (what the upstream docs'
 * own example uses) never evicts, which is a memory-growth risk for a
 * high-cardinality workload -- a different image per render, e.g.
 * per-user avatars in a batch run.
 *
 * See `image-resolver.ts` for the process-lifetime shared instance built
 * on this and ADR-0018 for why it's shared at that scope.
 */
export class BoundedImageFetchCache implements ImageFetchCacheLike {
  private readonly maxEntries: number;
  private readonly store = new Map<string, Promise<ArrayBuffer>>();

  constructor(maxEntries: number = DEFAULT_MAX_ENTRIES) {
    this.maxEntries = maxEntries;
  }

  get size(): number {
    return this.store.size;
  }

  get(url: string): Promise<ArrayBuffer> | undefined {
    const value = this.store.get(url);
    if (value === undefined) {
      return undefined;
    }
    // Promote to most-recently-used.
    this.store.delete(url);
    this.store.set(url, value);
    return value;
  }

  set(url: string, data: Promise<ArrayBuffer>): void {
    this.store.delete(url);
    this.store.set(url, data);
    if (this.store.size > this.maxEntries) {
      const oldest = this.store.keys().next().value;
      if (oldest !== undefined) {
        this.store.delete(oldest);
      }
    }
  }

  delete(url: string): void {
    this.store.delete(url);
  }

  clear(): void {
    this.store.clear();
  }
}
