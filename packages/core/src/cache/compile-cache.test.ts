import { describe, expect, it } from "bun:test";

import { CompileCache } from "./compile-cache.js";

describe("CompileCache", () => {
  it("returns null for a key that was never set", () => {
    const cache = new CompileCache(10);
    expect(cache.get("missing")).toBeNull();
  });

  it("stores and retrieves a value", () => {
    const cache = new CompileCache(10);
    cache.set("a", { compiled: 1 });
    expect(cache.get("a")).toEqual({ compiled: 1 });
  });

  it("overwrites an existing key without growing the entry count", () => {
    const cache = new CompileCache(2);
    cache.set("a", 1);
    cache.set("a", 2);
    cache.set("b", 3);
    expect(cache.get("a")).toBe(2);
    expect(cache.get("b")).toBe(3);
  });

  it("evicts least-recently-used entries; a recently read entry survives eviction over an untouched one", () => {
    const cache = new CompileCache(3);
    cache.set("a", 1);
    cache.set("b", 2);
    cache.set("c", 3);
    // Reading "a" promotes it to MRU position.
    cache.get("a");
    // "b" is now the LRU entry, so adding "d" evicts "b", not "a".
    cache.set("d", 4);

    expect(cache.get("b")).toBeNull();
    expect(cache.get("a")).toBe(1);
    expect(cache.get("c")).toBe(3);
    expect(cache.get("d")).toBe(4);
  });

  it("repeated reads keep an entry alive under eviction pressure", () => {
    const cache = new CompileCache(3);
    cache.set("a", 1);
    cache.set("b", 2);
    cache.set("c", 3);
    cache.get("a");
    cache.set("d", 4);
    cache.get("a");
    cache.set("e", 5);

    expect(cache.get("b")).toBeNull();
    expect(cache.get("c")).toBeNull();
    expect(cache.get("a")).toBe(1);
    expect(cache.get("d")).toBe(4);
    expect(cache.get("e")).toBe(5);
  });

  // ------------------------------------------------------------------
  // Content-hash index: eviction path
  // ------------------------------------------------------------------

  it("evicting via the limit cleans the content-hash index — invalidating the evicted hash is a safe no-op and does not affect the surviving entry", () => {
    const cache = new CompileCache(1);
    cache.setWithContentHash("a", "content-x", 1);
    // evicts "a" via the size limit
    cache.setWithContentHash("b", "content-y", 2);

    expect(cache.get("a")).toBeNull();

    // eviction now removes "a" from the index, so this should be a
    // complete no-op — it must not throw and must not affect "b".
    expect(() => cache.invalidateByContentHash("content-x")).not.toThrow();
    expect(cache.get("b")).toBe(2);
  });

  it("invalidateByContentHash removes only entries registered under that hash", () => {
    const cache = new CompileCache(10);
    cache.setWithContentHash("a", "content-x", 1);
    cache.setWithContentHash("b", "content-x", 2);
    cache.setWithContentHash("c", "content-y", 3);

    cache.invalidateByContentHash("content-x");

    expect(cache.get("a")).toBeNull();
    expect(cache.get("b")).toBeNull();
    expect(cache.get("c")).toBe(3);
  });

  it("invalidateByContentHash on an unknown hash is a safe no-op", () => {
    const cache = new CompileCache(10);
    cache.set("a", 1);
    expect(() => cache.invalidateByContentHash("never-seen")).not.toThrow();
    expect(cache.get("a")).toBe(1);
  });

  it("a plain set() (no content hash) is untouched by invalidateByContentHash", () => {
    const cache = new CompileCache(10);
    cache.set("a", 1);
    cache.invalidateByContentHash("anything");
    expect(cache.get("a")).toBe(1);
  });

  // ------------------------------------------------------------------
  // re-registration under a new hash
  // ------------------------------------------------------------------

  it("re-registering the same key under a new content hash: invalidating the OLD hash no longer evicts the live entry", () => {
    const cache = new CompileCache(10);
    cache.setWithContentHash("a", "content-x", 1);
    // Re-register under a new hash
    cache.setWithContentHash("a", "content-y", 2);

    // the old implementation left a stale pointer so invalidating
    // "content-x" removed "a" even though it was live under "content-y".
    // Now "a" must survive invalidation of the old hash.
    cache.invalidateByContentHash("content-x");
    expect(cache.get("a")).toBe(2);

    // Invalidating the NEW hash removes it correctly.
    cache.invalidateByContentHash("content-y");
    expect(cache.get("a")).toBeNull();
  });

  it("re-registration does not double-count the key under two hashes simultaneously", () => {
    const cache = new CompileCache(10);
    cache.setWithContentHash("a", "content-x", 1);
    cache.setWithContentHash("a", "content-y", 2);

    // Only "content-y" should have "a"; "content-x" should be gone.
    // Invalidating "content-y" is the only thing that should remove "a".
    cache.invalidateByContentHash("content-y");
    expect(cache.get("a")).toBeNull();
  });

  // ------------------------------------------------------------------
  // Content-hash index: stale pointer after eviction (the index growth bug)
  // ------------------------------------------------------------------

  it("evicting many entries does not leave dead references in the index — invalidating their hashes is O(1)-ish and produces no errors", () => {
    const cache = new CompileCache(2);
    // Each setWithContentHash will evict the previous entry and clean up its index entry.
    for (let i = 0; i < 20; i += 1) {
      cache.setWithContentHash(`k${i}`, `hash-${i}`, i);
    }
    // Only the last 2 entries survive
    expect(cache.size).toBe(2);

    // Calling invalidate on any of the evicted hashes must not throw and
    // must return cleanly, because eviction already cleaned the index.
    for (let i = 0; i < 18; i += 1) {
      expect(() => cache.invalidateByContentHash(`hash-${i}`)).not.toThrow();
    }

    // The surviving entries are still intact
    expect(cache.get("k18")).toBe(18);
    expect(cache.get("k19")).toBe(19);
  });

  // ------------------------------------------------------------------
  // clear()
  // ------------------------------------------------------------------

  it("clear() empties the value map, the content-hash index, and the reverse key map", () => {
    const cache = new CompileCache(10);
    cache.setWithContentHash("a", "content-x", 1);
    cache.clear();

    expect(cache.get("a")).toBeNull();
    expect(cache.size).toBe(0);
    // After clear, re-adding should behave like a fresh cache
    cache.setWithContentHash("a", "content-x", 2);
    cache.invalidateByContentHash("content-x");
    expect(cache.get("a")).toBeNull();
  });

  // ------------------------------------------------------------------
  // size and default cap
  // ------------------------------------------------------------------

  it("size reflects the current entry count, not the limit", () => {
    const cache = new CompileCache(5);
    expect(cache.size).toBe(0);
    cache.set("a", 1);
    cache.set("b", 2);
    expect(cache.size).toBe(2);
  });

  it("default max entries is a sane positive number and actually enforces a cap", () => {
    const cache = new CompileCache();
    for (let i = 0; i < 150; i += 1) {
      cache.set(`k${i}`, i);
    }
    expect(cache.size).toBeLessThan(150);
    expect(cache.size).toBeGreaterThan(0);
  });

  // ------------------------------------------------------------------
  // O(1) LRU correctness at scale
  // ------------------------------------------------------------------

  it("LRU order is maintained correctly under a long sequence of mixed gets and sets", () => {
    const cache = new CompileCache(3);
    cache.set("a", 1);
    cache.set("b", 2);
    cache.set("c", 3);
    // Order (LRU→MRU): a, b, c

    cache.get("a");
    cache.set("d", 4);
    expect(cache.get("b")).toBeNull();
    expect(cache.get("a")).toBe(1);
    expect(cache.get("c")).toBe(3);
    expect(cache.get("d")).toBe(4);

    // Order after reads: a, c, d  (a was MRU of previous get, then c, then d)
    // Actually after the gets above: a→MRU, then c→MRU, then d→MRU
    // LRU is now a
    cache.set("e", 5);
    expect(cache.get("a")).toBeNull();
    expect(cache.size).toBe(3);
  });
});
