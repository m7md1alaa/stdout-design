// oxlint-disable typescript/no-non-null-assertion
/**
 * CompileCache: in-memory compile-result cache.
 *
 * Process-local only, never persisted, never shared across processes.
 * Cheap to recompute, so this uses a simple LRU eviction policy: the
 * `get()` method promotes a hit to most-recently-used position before
 * returning, and eviction removes the least-recently-used entry when
 * capacity is exceeded.
 *
 * (was O(n)): LRU is now implemented with a doubly-linked list +
 * Map so that get(), set(), and eviction are all O(1). The old
 * implementation used Array.indexOf + Array.splice which were O(n) per
 * access.
 *
 * setWithContentHash() now removes the key from the old hash Set
 * before registering it under the new one, so invalidating an old
 * content hash can never evict a freshly-registered live entry.
 *
 * the LRU eviction path now removes evicted keys from the
 * content-hash index so the index doesn't grow with dead references.
 */

const DEFAULT_COMPILED_MAX = 100;

interface LRUNode {
  key: string;
  value: unknown;
  prev: LRUNode | null;
  next: LRUNode | null;
}

export class CompileCache {
  private readonly maxEntries: number;

  // Map from cache key → node (O(1) lookup)
  private readonly nodeMap = new Map<string, LRUNode>();

  // Sentinel head (oldest) and tail (newest) — never removed, never in nodeMap
  private readonly head: LRUNode;
  private readonly tail: LRUNode;

  // content-hash → Set of keys registered under that hash
  private readonly contentHashIndex = new Map<string, Set<string>>();
  // reverse: key → contentHash (so re-registration can de-index from old set)
  private readonly keyToContentHash = new Map<string, string>();

  constructor(maxEntries: number = DEFAULT_COMPILED_MAX) {
    this.maxEntries = maxEntries;

    // Sentinel nodes keep the linked-list logic branch-free
    this.head = { key: "", next: null, prev: null, value: undefined };
    this.tail = { key: "", next: null, prev: null, value: undefined };
    this.head.next = this.tail;
    this.tail.prev = this.head;
  }

  get size(): number {
    return this.nodeMap.size;
  }

  get(key: string): unknown {
    const node = this.nodeMap.get(key);
    if (!node) {
      return null;
    }
    this.moveToTail(node);
    return node.value;
  }

  set(key: string, value: unknown): void {
    const existing = this.nodeMap.get(key);
    if (existing) {
      existing.value = value;
      this.moveToTail(existing);
      return;
    }

    const node: LRUNode = { key, next: null, prev: null, value };
    this.nodeMap.set(key, node);
    this.insertBeforeTail(node);

    if (this.nodeMap.size > this.maxEntries) {
      this.evictLRU();
    }
  }

  /**
   * Use this instead of `set` when the entry should be invalidatable by
   * template content hash later (the normal case for template compile
   * results).
   *
   * if this key was previously registered under a different content
   * hash, it is removed from that old hash's Set first. The old
   * implementation left a stale pointer that could cause invalidating the
   * old hash to evict the newly-registered live entry.
   */
  setWithContentHash(key: string, contentHash: string, value: unknown): void {
    const previousHash = this.keyToContentHash.get(key);
    if (previousHash !== undefined && previousHash !== contentHash) {
      const oldSet = this.contentHashIndex.get(previousHash);
      if (oldSet) {
        oldSet.delete(key);
        if (oldSet.size === 0) {
          this.contentHashIndex.delete(previousHash);
        }
      }
    }

    this.set(key, value);

    let set = this.contentHashIndex.get(contentHash);
    if (!set) {
      set = new Set();
      this.contentHashIndex.set(contentHash, set);
    }
    set.add(key);
    this.keyToContentHash.set(key, contentHash);
  }

  /**
   * Invalidate entries previously written via `setWithContentHash` for a
   * given content hash. Uses the explicit index built at write time.
   */
  invalidateByContentHash(contentHash: string): void {
    const keys = this.contentHashIndex.get(contentHash);
    if (!keys) {
      return;
    }

    for (const key of keys) {
      this.removeNode(key);
    }
    this.contentHashIndex.delete(contentHash);
  }

  clear(): void {
    this.nodeMap.clear();
    this.contentHashIndex.clear();
    this.keyToContentHash.clear();
    // Reset sentinel links
    this.head.next = this.tail;
    this.tail.prev = this.head;
  }

  // ------------------------------------------------------------------
  // Private linked-list helpers — all O(1)
  // ------------------------------------------------------------------

  private insertBeforeTail(node: LRUNode): void {
    const prev = this.tail.prev!;
    node.prev = prev;
    node.next = this.tail;
    prev.next = node;
    this.tail.prev = node;
  }

  private static removeFromList(node: LRUNode): void {
    node.prev!.next = node.next;
    node.next!.prev = node.prev;
    node.prev = null;
    node.next = null;
  }

  private moveToTail(node: LRUNode): void {
    CompileCache.removeFromList(node);
    this.insertBeforeTail(node);
  }

  /**
   * Evict the least-recently-used entry (head.next).
   * also removes the key from the content-hash index so the index
   * doesn't accumulate dead references over time.
   */
  private evictLRU(): void {
    const lru = this.head.next;
    if (!lru || lru === this.tail) {
      return;
    }
    this.removeNode(lru.key);
  }

  /**
   * Fully removes a key from the node map, linked list, and content-hash
   * index (both forward and reverse).
   */
  private removeNode(key: string): void {
    const node = this.nodeMap.get(key);
    if (!node) {
      return;
    }
    CompileCache.removeFromList(node);
    this.nodeMap.delete(key);

    const contentHash = this.keyToContentHash.get(key);
    if (contentHash !== undefined) {
      this.keyToContentHash.delete(key);
      const set = this.contentHashIndex.get(contentHash);
      if (set) {
        set.delete(key);
        if (set.size === 0) {
          this.contentHashIndex.delete(contentHash);
        }
      }
    }
  }
}
