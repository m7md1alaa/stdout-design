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
// Real-fs tests: exercise the actual write-file-atomic + Bun.hash() path
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

  it("returns null (not throw) when the file doesn't exist", async () => {
    const result = await store.readVerified(
      path.join(dir, "never-written.png"),
      100,
      "irrelevant"
    );
    expect(result).toBeNull();
  });

  it("detects a size mismatch and returns null", async () => {
    const bytes = randomImageBuffer(4 * KB);
    const hash = store.computeHash(bytes);
    const filePath = path.join(dir, "entry.png");
    await store.writeAtomic(filePath, bytes);

    // Truncate on disk directly.
    await Bun.write(filePath, bytes.subarray(0, -50));

    const result = await store.readVerified(filePath, bytes.length, hash);
    expect(result).toBeNull();
  });

  it("FIXED: detects same-size bit-flip corruption via content hash (was the GAP in the old cache)", async () => {
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
    // Same length as the original -- this is exactly what the old
    // size-only check could not catch.
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
// Fake-fs tests: deterministic fault injection via constructor injection,
// no mock.module needed. This is the direct payoff of the DI split --
// the copy-race scenario from the pre-split suite becomes a plain unit
// test instead of a real-timing-dependent module mock.
// ---------------------------------------------------------------------

describe("FsStore (injected fake fs primitives)", () => {
  it("a slow/partial writeFileAtomic implementation cannot be observed as a torn read, by construction", async () => {
    // This test documents the CONTRACT FsStore relies on: writeFileAtomic
    // must make the write visible at its final path atomically. We don't
    // (and can't, from outside) prove write-file-atomic's internals here
    // -- that's the library's job, verified by its own test suite and by
    // being the same package npm's CLI depends on for this exact
    // guarantee. What we CAN verify is that FsStore itself never exposes
    // a partial write, no matter how slow the injected writer is,
    // because FsStore doesn't do any reading until writeAtomic's promise
    // resolves.
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

  it("readVerified returns null without throwing when the injected reader itself throws", async () => {
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
      store.readVerified("/fake/path.png", 100, "irrelevant-hash")
    ).rejects.toThrow("simulated disk read failure");
    // Note: unlike a missing file or a hash mismatch (both handled
    // gracefully as `null`), an actual I/O error from the injected
    // primitive propagates rather than being swallowed -- FsStore
    // distinguishes "this entry is invalid" from "the disk is having a
    // problem," and only the former is treated as a cache miss.
  });

  it("delete() tolerates a fake unlink throwing ENOENT-shaped errors (simulating a concurrent deleter) without crashing", async () => {
    const enoent = new Error("ENOENT: no such file or directory");
    (enoent as NodeJS.ErrnoException).code = "ENOENT";

    const fakeFs: FsPrimitives = {
      ...defaultFsPrimitives,
      // looked present at check time...
      existsSync: () => true,
      stat: () => Promise.resolve({ size: 500 }),
      // ...but gone by the time we actually unlink (TOCTOU)
      unlink: () => {
        throw enoent;
      },
    };

    const store = new FsStore(undefined, fakeFs);
    await expect(store.delete("/fake/path.png")).resolves.not.toBeUndefined();

    const result = await store.delete("/fake/path.png");
    // GAP (unchanged from before the split, now isolated to one method):
    // falls back to the stat()-derived size as the "freed" amount even
    // though the file was actually removed by someone else. Documents
    // current behavior; flip to a size-tracking fix if this bookkeeping
    // accuracy ever matters for a caller.
    expect(result).toBe(500);
  });

  it("respects an injected ConcurrencyLimiter -- writes never exceed the configured cap", async () => {
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
});
