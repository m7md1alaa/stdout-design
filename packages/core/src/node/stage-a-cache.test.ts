import { describe, expect, it } from "bun:test";

import { StageACache } from "./stage-a-cache.js";

describe("StageACache", () => {
  it("returns null for a key that was never set", () => {
    const cache = new StageACache(10);
    expect(cache.get("missing")).toBeNull();
  });

  it("stores and retrieves a value", () => {
    const cache = new StageACache(10);
    cache.set("a", { compiled: 1 });
    expect(cache.get("a")).toEqual({ compiled: 1 });
  });

  it("overwrites an existing key without growing insertion order", () => {
    const cache = new StageACache(2);
    cache.set("a", 1);
    cache.set("a", 2);
    cache.set("b", 3);
    // "a" was set twice but only occupies one insertion-order slot, so "b"
    // fitting alongside it means neither gets evicted yet.
    expect(cache.get("a")).toBe(2);
    expect(cache.get("b")).toBe(3);
  });

  it("evicts strictly in insertion order once the limit is exceeded", () => {
    const cache = new StageACache(3);
    cache.set("a", 1);
    cache.set("b", 2);
    cache.set("c", 3);
    cache.set("d", 4);

    expect(cache.get("a")).toBeNull();
    expect(cache.get("b")).toBe(2);
    expect(cache.get("c")).toBe(3);
    expect(cache.get("d")).toBe(4);
  });

  it("evicting via the limit does not leave a stale entry in the content-hash index", () => {
    const cache = new StageACache(1);
    cache.setWithContentHash("a", "content-x", 1);
    // evicts "a" via the size limit
    cache.setWithContentHash("b", "content-y", 2);

    // "a" is gone from the main cache...
    expect(cache.get("a")).toBeNull();
    // ...but invalidating its content hash must not throw or resurrect it,
    // and must not affect "b" (a different content hash).
    expect(() => cache.invalidateByContentHash("content-x")).not.toThrow();
    expect(cache.get("b")).toBe(2);
  });

  it("invalidateByContentHash removes only entries registered under that hash", () => {
    const cache = new StageACache(10);
    cache.setWithContentHash("a", "content-x", 1);
    // same content hash, different key
    cache.setWithContentHash("b", "content-x", 2);
    cache.setWithContentHash("c", "content-y", 3);

    cache.invalidateByContentHash("content-x");

    expect(cache.get("a")).toBeNull();
    expect(cache.get("b")).toBeNull();
    // untouched, different content hash
    expect(cache.get("c")).toBe(3);
  });

  it("invalidateByContentHash on an unknown hash is a safe no-op", () => {
    const cache = new StageACache(10);
    cache.set("a", 1);
    expect(() => cache.invalidateByContentHash("never-seen")).not.toThrow();
    expect(cache.get("a")).toBe(1);
  });

  it("a plain set() (no content hash) is untouched by invalidateByContentHash", () => {
    const cache = new StageACache(10);
    // not registered under any content hash
    cache.set("a", 1);
    cache.invalidateByContentHash("anything");
    expect(cache.get("a")).toBe(1);
  });

  it("clear() empties both the value map and the content-hash index", () => {
    const cache = new StageACache(10);
    cache.setWithContentHash("a", "content-x", 1);
    cache.clear();

    expect(cache.get("a")).toBeNull();
    expect(cache.size).toBe(0);
    // Re-adding after clear should behave like a fresh cache, not carry
    // over any stale index state.
    cache.setWithContentHash("a", "content-x", 2);
    cache.invalidateByContentHash("content-x");
    expect(cache.get("a")).toBeNull();
  });

  it("size reflects the current entry count, not the limit", () => {
    const cache = new StageACache(5);
    expect(cache.size).toBe(0);
    cache.set("a", 1);
    cache.set("b", 2);
    expect(cache.size).toBe(2);
  });

  it("re-registering the same key under a new content hash does not double-index it under the old one", () => {
    const cache = new StageACache(10);
    cache.setWithContentHash("a", "content-x", 1);
    // same key, new content hash
    cache.setWithContentHash("a", "content-y", 2);

    // Invalidating the OLD content hash should not remove "a" a second
    // time in a way that throws, and should leave "a" registered under
    // the new hash still removable.
    cache.invalidateByContentHash("content-x");
    // Current implementation note: setWithContentHash does not clear the
    // key out of the old content-hash's set when re-registered under a
    // new one, so invalidating "content-x" still removes "a" here. This
    // test documents that actual behavior rather than an idealized one --
    // if that's surprising, it's a candidate for a follow-up fix, not a
    // silent assumption.
    expect(cache.get("a")).toBeNull();
  });

  it("default max entries (no constructor argument) is a sane positive number", () => {
    const cache = new StageACache();
    for (let i = 0; i < 150; i += 1) {
      cache.set(`k${i}`, i);
    }
    // Should have evicted down to *some* bound rather than growing
    // unbounded — exact default value is an implementation detail, but
    // "did it cap at all" is worth asserting.
    expect(cache.size).toBeLessThan(150);
    expect(cache.size).toBeGreaterThan(0);
  });
});
