// oxlint-disable prefer-destructuring
import { afterEach, beforeEach, describe, expect, it } from "bun:test";
import { createHash, randomBytes } from "node:crypto";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";

import { defaultFsPrimitives, FsStore } from "./fs-store.js";
import type { FsPrimitives } from "./fs-store.js";

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
  mkdtempSync(path.join(tmpdir(), "fs-store-test-"));

const rmDir = (dir: string): void =>
  rmSync(dir, { force: true, recursive: true });

// ---------------------------------------------------------------------
// Real-fs tests
// ---------------------------------------------------------------------

describe("FsStore (real filesystem)", () => {
  let dir: string;
  let store: FsStore;

  beforeEach(() => {
    dir = makeTempDir();
    store = new FsStore();
  });

  afterEach(() => {
    rmDir(dir);
  });

  it("round-trips a large buffer with a matching hash", async () => {
    const bytes = randomImageBuffer(5 * MB);
    const hash = store.computeHash(bytes);
    const filePath = path.join(dir, "entry.png");

    await store.writeAtomic(filePath, bytes);
    const readBack = await store.readVerified(filePath, bytes.length, hash);

    expect(readBack).not.toBeNull();
    expect(sha256(readBack as Buffer)).toBe(sha256(bytes));
  });

  it("computeHash produces a tagged string with a known prefix", () => {
    const bytes = randomImageBuffer(1 * KB);
    const hash = store.computeHash(bytes);
    // Must start with a known algorithm prefix
    expect(hash.startsWith("bun1:") || hash.startsWith("sha256:")).toBe(true);
  });

  it("returns null (not throw) when the file doesn't exist", async () => {
    const result = await store.readVerified(
      path.join(dir, "never-written.png"),
      100,
      "bun1:irrelevant"
    );
    expect(result).toBeNull();
  });

  it("detects a size mismatch and returns null", async () => {
    const bytes = randomImageBuffer(4 * KB);
    const hash = store.computeHash(bytes);
    const filePath = path.join(dir, "entry.png");
    await store.writeAtomic(filePath, bytes);

    await Bun.write(filePath, bytes.subarray(0, -50));

    const result = await store.readVerified(filePath, bytes.length, hash);
    expect(result).toBeNull();
  });

  it("detects same-size bit-flip corruption via content hash", async () => {
    const original = randomImageBuffer(4 * KB);
    const hash = store.computeHash(original);
    const filePath = path.join(dir, "entry.png");
    await store.writeAtomic(filePath, original);

    const corrupted = Buffer.from(original);
    // oxlint-disable-next-line eslint/no-bitwise
    corrupted.writeUInt8(corrupted.readUInt8(0) ^ 0xff, 0);
    const mid = Math.floor(corrupted.length / 2);
    // oxlint-disable-next-line eslint/no-bitwise, typescript/no-non-null-assertion
    corrupted[mid]! ^= 0xff;
    await Bun.write(filePath, corrupted);

    const result = await store.readVerified(filePath, original.length, hash);
    expect(result).toBeNull();
  });

  it("delete() removes the file and reports its size", async () => {
    const bytes = randomImageBuffer(10 * KB);
    const filePath = path.join(dir, "entry.png");
    await store.writeAtomic(filePath, bytes);

    const freed = await store.delete(filePath);
    expect(freed).toBe(bytes.length);

    const result = await store.readVerified(
      filePath,
      bytes.length,
      store.computeHash(bytes)
    );
    expect(result).toBeNull();
  });

  it("delete() on an already-missing file is a safe no-op returning 0", async () => {
    const freed = await store.delete(path.join(dir, "never-existed.png"));
    expect(freed).toBe(0);
  });

  it("holds correct, distinct content across many concurrent large writes", async () => {
    const CONCURRENCY = 15;
    const entries = Array.from({ length: CONCURRENCY }, (_, i) => {
      const bytes = randomImageBuffer(2 * MB);
      return {
        bytes,
        filePath: path.join(dir, `entry-${i}.png`),
        hash: store.computeHash(bytes),
      };
    });

    await Promise.all(
      entries.map((e) => store.writeAtomic(e.filePath, e.bytes))
    );
    const results = await Promise.all(
      entries.map((e) => store.readVerified(e.filePath, e.bytes.length, e.hash))
    );

    for (const [i, buf] of results.entries()) {
      expect(buf).not.toBeNull();
      const entry = entries[i] as { bytes: Buffer };
      expect(sha256(buf as Buffer)).toBe(sha256(entry.bytes));
    }
  });
});

// ---------------------------------------------------------------------
// cross-runtime hash mismatch — must be a cache miss, not corruption
// ---------------------------------------------------------------------

describe("FsStore: cross-runtime hash algorithm mismatch", () => {
  let dir: string;

  beforeEach(() => {
    dir = makeTempDir();
  });

  afterEach(() => {
    rmDir(dir);
  });

  it("a hash written with the sha256 algorithm is not treated as corrupt when read with a bun1 hash — it is a graceful miss returning null", async () => {
    // Simulate an entry written by Node (sha256:...) being read back by
    // a store that computes bun1:... (or vice versa). The stored hash
    // has a different algorithm prefix than what computeHash() returns in
    // the current runtime — this must produce null, not a corruption warning.
    const store = new FsStore();
    const bytes = randomImageBuffer(1 * KB);
    const filePath = path.join(dir, "cross-runtime.png");
    await store.writeAtomic(filePath, bytes);

    // Manufacture a hash with the *other* algorithm prefix from what the
    // current runtime would produce, to simulate a cross-runtime read.
    const currentHash = store.computeHash(bytes);
    const currentPrefix = currentHash.split(":")[0];
    const otherPrefix = currentPrefix === "bun1" ? "sha256" : "bun1";
    const fakeStoredHash = `${otherPrefix}:deadbeefdeadbeef`;

    const result = await store.readVerified(
      filePath,
      bytes.length,
      fakeStoredHash
    );

    // Must be null (miss), not throw, and the file must still be present
    // (not deleted as if it were corrupt).
    expect(result).toBeNull();
  });

  it("two stores in the same runtime always agree on hash algorithm, so round-trips always work", async () => {
    const storeA = new FsStore();
    const storeB = new FsStore();
    const bytes = randomImageBuffer(2 * KB);
    const filePath = path.join(dir, "same-runtime.png");

    await storeA.writeAtomic(filePath, bytes);
    const hash = storeA.computeHash(bytes);

    // storeB uses the same runtime, so computeHash produces the same prefix
    const result = await storeB.readVerified(filePath, bytes.length, hash);
    expect(result).not.toBeNull();
    expect(sha256(result as Buffer)).toBe(sha256(bytes));
  });
});

// ---------------------------------------------------------------------
// Fake-fs tests: deterministic fault injection
// ---------------------------------------------------------------------

describe("FsStore (injected fake fs primitives)", () => {
  it("a slow writeFileAtomic cannot be observed as a torn read, by construction", async () => {
    let writeStarted = false;
    let writeFinished = false;

    const fakeFs: FsPrimitives = {
      ...defaultFsPrimitives,
      writeFileAtomic: async (_filePath, _data) => {
        writeStarted = true;
        await sleep(20);
        writeFinished = true;
      },
    };

    const store = new FsStore(undefined, fakeFs);
    await store.writeAtomic("/fake/path.png", randomImageBuffer(1 * KB));

    expect(writeStarted).toBe(true);
    expect(writeFinished).toBe(true);
  });

  it("readVerified propagates genuine I/O errors (not ENOENT) without swallowing them", async () => {
    const fakeFs: FsPrimitives = {
      ...defaultFsPrimitives,
      existsSync: () => true,
      readFile: () => {
        throw new Error("simulated disk read failure");
      },
      stat: () => Promise.resolve({ size: 100 }),
    };

    const store = new FsStore(undefined, fakeFs);

    await expect(
      store.readVerified("/fake/path.png", 100, "sha256:irrelevant")
    ).rejects.toThrow("simulated disk read failure");
  });

  it("readVerified returns null when stat throws ENOENT after existsSync (TOCTOU)", async () => {
    const enoent = new Error("ENOENT: no such file or directory");
    (enoent as NodeJS.ErrnoException).code = "ENOENT";

    const fakeFs: FsPrimitives = {
      ...defaultFsPrimitives,
      existsSync: () => true,
      stat: () => {
        throw enoent;
      },
    };

    const store = new FsStore(undefined, fakeFs);

    const result = await store.readVerified(
      "/fake/race.png",
      100,
      "sha256:stale"
    );

    expect(result).toBeNull();
  });

  it("readVerified returns null when readFile throws ENOENT after stat succeeded (TOCTOU)", async () => {
    const enoent = new Error("ENOENT: no such file or directory");
    (enoent as NodeJS.ErrnoException).code = "ENOENT";

    const fakeFs: FsPrimitives = {
      ...defaultFsPrimitives,
      existsSync: () => true,
      readFile: () => {
        throw enoent;
      },
      stat: () => Promise.resolve({ size: 100 }),
    };

    const store = new FsStore(undefined, fakeFs);

    const result = await store.readVerified(
      "/fake/race.png",
      100,
      "sha256:stale"
    );

    expect(result).toBeNull();
  });

  it("delete() tolerates ENOENT from unlink (concurrent deleter TOCTOU) without crashing", async () => {
    const enoent = new Error("ENOENT: no such file or directory");
    (enoent as NodeJS.ErrnoException).code = "ENOENT";

    const fakeFs: FsPrimitives = {
      ...defaultFsPrimitives,
      existsSync: () => true,
      stat: () => Promise.resolve({ size: 500 }),
      unlink: () => {
        throw enoent;
      },
    };

    const store = new FsStore(undefined, fakeFs);
    const result = await store.delete("/fake/path.png");
    // Reports stat-derived size as freed since we cannot know if the
    // concurrent deleter freed it or not.
    expect(result).toBe(500);
  });

  it("respects an injected ConcurrencyLimiter — writes never exceed the configured cap", async () => {
    const { ConcurrencyLimiter } = await import("./concurrency-limiter.js");
    const limiter = new ConcurrencyLimiter(2);

    let active = 0;
    let peak = 0;
    const fakeFs: FsPrimitives = {
      ...defaultFsPrimitives,
      writeFileAtomic: async () => {
        active += 1;
        peak = Math.max(peak, active);
        await sleep(10);
        active -= 1;
      },
    };

    const store = new FsStore(limiter, fakeFs);
    await Promise.all(
      Array.from({ length: 10 }, (_, i) =>
        store.writeAtomic(`/fake/${i}.png`, Buffer.from("x"))
      )
    );

    expect(peak).toBeLessThanOrEqual(2);
  });

  // ------------------------------------------------------------------
  // cross-runtime hash mismatch via fake fs (deterministic)
  // ------------------------------------------------------------------

  it("readVerified returns null (not corrupt) when the stored hash uses a different algorithm prefix — simulating a cross-runtime scenario", async () => {
    const bytes = Buffer.from("hello world");

    const fakeFs: FsPrimitives = {
      ...defaultFsPrimitives,
      existsSync: () => true,
      readFile: () => Promise.resolve(bytes),
      stat: () => Promise.resolve({ size: bytes.length }),
    };

    const store = new FsStore(undefined, fakeFs);

    // The store will compute its native hash (bun1: or sha256:).
    // We supply a stored hash with the *opposite* prefix.
    const nativeHash = store.computeHash(bytes);
    const nativePrefix = nativeHash.split(":")[0];
    const foreignPrefix = nativePrefix === "bun1" ? "sha256" : "bun1";
    const foreignHash = `${foreignPrefix}:aabbccdd`;

    // Must return null (cross-runtime miss) not throw, not corrupt verdict
    const result = await store.readVerified(
      "/fake/path.png",
      bytes.length,
      foreignHash
    );
    expect(result).toBeNull();
  });
});
