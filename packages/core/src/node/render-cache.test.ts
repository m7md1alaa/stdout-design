import { afterEach, beforeEach, describe, expect, it } from "bun:test";
import { createHash, randomBytes } from "node:crypto";
import { existsSync, mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";

import { RenderCache } from "./render-cache.js";

const KB = 1024;
const MB = 1024 * KB;

const randomImageBuffer = (sizeBytes: number): Buffer =>
  Buffer.from(randomBytes(sizeBytes));

const sha256 = (buf: Buffer): string =>
  createHash("sha256").update(buf).digest("hex");

const sleep = (ms: number): Promise<void> => {
  const { promise, resolve } = Promise.withResolvers<undefined>();
  setTimeout(resolve, ms);
  return promise;
};

const makeTempDir = (): string =>
  mkdtempSync(path.join(tmpdir(), "render-cache-integration-"));

const rmDir = (dir: string): void =>
  rmSync(dir, { force: true, recursive: true });

describe("RenderCache: end-to-end round-trip and corruption detection", () => {
  let dir: string;
  let cache: RenderCache;

  beforeEach(async () => {
    dir = makeTempDir();
    cache = new RenderCache({ cacheDir: dir, maxSizeMB: 500 });
    await cache.init();
  });

  afterEach(() => {
    cache.close();
    rmDir(dir);
  });

  it("round-trips a large buffer through the full stack (FsStore write -> MetadataStore row -> FsStore verified read)", async () => {
    const bytes = randomImageBuffer(10 * MB);
    const key = RenderCache.createPixelCacheKey({
      format: "png",
      height: 1080,
      propsJSON: "{}",
      templateContentHash: "hash-a",
      width: 1920,
    });

    await cache.setPixels(key, bytes, 1920, 1080, "png");
    const readBack = await cache.getPixels(key);

    expect(readBack).not.toBeNull();
    expect(sha256(readBack as Buffer)).toBe(sha256(bytes));
  });

  it("FIXED: same-size bit-flip corruption is now detected end-to-end and self-heals the stale row (this was the GAP in the pre-split cache)", async () => {
    const original = randomImageBuffer(4 * KB);
    const key = RenderCache.createPixelCacheKey({
      format: "png",
      height: 10,
      propsJSON: "{}",
      templateContentHash: "corrupt-me",
      width: 10,
    });
    const filePath = await cache.setPixels(key, original, 10, 10, "png");

    const corrupted = Buffer.from(original);
    // oxlint-disable-next-line eslint/no-bitwise
    corrupted.writeUInt8(corrupted.readUInt8(0) ^ 0xff, 0);
    const mid = Math.floor(corrupted.length / 2);
    // oxlint-disable-next-line eslint/no-bitwise, typescript/no-non-null-assertion
    corrupted[mid]! ^= 0xff;
    // same length as `original`
    await Bun.write(filePath, corrupted);

    const result = await cache.getPixels(key);
    // caught by content-hash verification, not silently served
    expect(result).toBeNull();

    // Self-healed: the stale row is gone, not just the read failing.
    const stats = await cache.stats();
    expect(stats.pixels.entries).toBe(0);
  });

  it("a write that fails FsStore verification on next read doesn't leave orphaned bytes counted in totals", async () => {
    const bytes = randomImageBuffer(2 * KB);
    const key = RenderCache.createPixelCacheKey({
      format: "png",
      height: 5,
      propsJSON: "{}",
      templateContentHash: "orphan-check",
      width: 5,
    });
    const filePath = await cache.setPixels(key, bytes, 5, 5, "png");

    let stats = await cache.stats();
    expect(stats.pixels.sizeBytes).toBe(bytes.length);

    // Truncate to simulate corruption, then force a read (which self-heals).
    await Bun.write(filePath, bytes.subarray(0, -10));
    await cache.getPixels(key);

    stats = await cache.stats();
    expect(stats.pixels.sizeBytes).toBe(0);
    expect(stats.pixels.entries).toBe(0);
  });

  it("re-rendering the same key at a new size updates totals correctly (upsert path, not insert+orphan)", async () => {
    const key = RenderCache.createPixelCacheKey({
      format: "png",
      height: 5,
      propsJSON: "{}",
      templateContentHash: "resize",
      width: 5,
    });

    await cache.setPixels(key, randomImageBuffer(1 * KB), 5, 5, "png");
    let stats = await cache.stats();
    expect(stats.pixels.sizeBytes).toBe(1 * KB);
    expect(stats.pixels.entries).toBe(1);

    await cache.setPixels(key, randomImageBuffer(3 * KB), 5, 5, "png");
    stats = await cache.stats();
    expect(stats.pixels.sizeBytes).toBe(3 * KB);
    expect(stats.pixels.entries).toBe(1);
  });
});

describe("RenderCache: large-buffer concurrent load", () => {
  let dir: string;
  let cache: RenderCache;

  beforeEach(async () => {
    dir = makeTempDir();
    cache = new RenderCache({
      cacheDir: dir,
      maxConcurrentWrites: 8,
      maxSizeMB: 500,
    });
    await cache.init();
  });

  afterEach(() => {
    cache.close();
    rmDir(dir);
  });

  it("holds correct, non-corrupted data across many concurrent large writes with a bounded concurrency limiter engaged", async () => {
    const CONCURRENCY = 20;
    const SIZE = 5 * MB;

    const entries = Array.from({ length: CONCURRENCY }, (_, i) => {
      const bytes = randomImageBuffer(SIZE);
      const key = RenderCache.createPixelCacheKey({
        format: "png",
        height: 100 + i,
        propsJSON: `{"i":${i}}`,
        templateContentHash: `hash-${i}`,
        width: 100 + i,
      });
      return { bytes, hash: sha256(bytes), key };
    });

    await Promise.all(
      entries.map((e) => cache.setPixels(e.key, e.bytes, 100, 100, "png"))
    );
    const results = await Promise.all(
      entries.map((e) => cache.getPixels(e.key))
    );

    for (const [i, buf] of results.entries()) {
      expect(buf).not.toBeNull();
      const entry = entries[i] as { bytes: Buffer; hash: string; key: string };
      expect(sha256(buf as Buffer)).toBe(entry.hash);
    }
  });
});

describe("RenderCache: multi-process access", () => {
  let dir: string;

  beforeEach(() => {
    dir = makeTempDir();
  });

  afterEach(() => {
    rmDir(dir);
  });

  it("two RenderCache instances (simulating two processes) init() concurrently and see each other's writes", async () => {
    const cacheA = new RenderCache({ cacheDir: dir, maxSizeMB: 500 });
    const cacheB = new RenderCache({ cacheDir: dir, maxSizeMB: 500 });

    await Promise.all([cacheA.init(), cacheB.init()]);

    const bytes = randomImageBuffer(10 * KB);
    const key = RenderCache.createPixelCacheKey({
      format: "png",
      height: 1,
      propsJSON: "{}",
      templateContentHash: "cross-process",
      width: 1,
    });

    await cacheA.setPixels(key, bytes, 1, 1, "png");
    const seenFromB = await cacheB.getPixels(key);

    expect(seenFromB).not.toBeNull();
    expect(sha256(seenFromB as Buffer)).toBe(sha256(bytes));

    cacheA.close();
    cacheB.close();
  });

  it("concurrent clean() from two instances on the same directory does not throw, double-free, or leave inconsistent state", async () => {
    const cacheA = new RenderCache({ cacheDir: dir, maxSizeMB: 500 });
    const cacheB = new RenderCache({ cacheDir: dir, maxSizeMB: 500 });
    await Promise.all([cacheA.init(), cacheB.init()]);

    for (let i = 0; i < 10; i += 1) {
      const key = RenderCache.createPixelCacheKey({
        format: "png",
        height: i,
        propsJSON: `{"i":${i}}`,
        templateContentHash: `clean-${i}`,
        width: i,
      });
      // oxlint-disable-next-line eslint/no-await-in-loop
      await cacheA.setPixels(key, randomImageBuffer(10 * KB), i, i, "png");
    }

    // The EvictionCoordinator's lock means only one of these actually runs
    // the sweep; the other should skip cleanly rather than racing it.
    const results = await Promise.allSettled([cacheA.clean(), cacheB.clean()]);
    for (const r of results) {
      expect(r.status).toBe("fulfilled");
    }

    const statsA = await cacheA.stats();
    expect(statsA.pixels.entries).toBe(0);
    expect(existsSync(dir)).toBe(true);

    cacheA.close();
    cacheB.close();
  });
});

describe("RenderCache: eviction under real write traffic", () => {
  let dir: string;
  let cache: RenderCache;

  beforeEach(async () => {
    dir = makeTempDir();
    cache = new RenderCache({
      cacheDir: dir,
      compiledMaxEntries: 10,
      evictionDebounceMs: 20,
      maxSizeMB: 1,
    });
    await cache.init();
  });

  afterEach(() => {
    cache.close();
    rmDir(dir);
  });

  it("enforces the size budget via debounced LRU eviction, oldest last-accessed evicted first", async () => {
    const ENTRY_SIZE = 100 * KB;
    const keys: string[] = [];

    for (let i = 0; i < 20; i += 1) {
      const key = RenderCache.createPixelCacheKey({
        format: "png",
        height: i,
        propsJSON: `{"i":${i}}`,
        templateContentHash: `lru-${i}`,
        width: i,
      });
      keys.push(key);
      // oxlint-disable-next-line eslint/no-await-in-loop
      await cache.setPixels(key, randomImageBuffer(ENTRY_SIZE), i, i, "png");
      // oxlint-disable-next-line eslint/no-await-in-loop
      await sleep(2);
    }

    // Give the debounced eviction coordinator time to actually run.
    await sleep(100);

    const stats = await cache.stats();
    expect(stats.pixels.sizeBytes).toBeLessThanOrEqual(
      stats.pixels.maxSizeBytes
    );

    // oxlint-disable-next-line typescript/no-non-null-assertion
    const oldest = await cache.getPixels(keys[0]!);
    // oxlint-disable-next-line typescript/no-non-null-assertion
    const newest = await cache.getPixels(keys.at(-1)!);
    expect(oldest).toBeNull();
    expect(newest).not.toBeNull();
  });
});
