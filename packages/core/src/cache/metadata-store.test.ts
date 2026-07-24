import { afterEach, beforeEach, describe, expect, it } from "bun:test";
import { existsSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";

import { MetadataStore } from "./metadata-store.js";

const makeTempDir = (): string =>
  mkdtempSync(path.join(tmpdir(), "metadata-store-test-"));

const rmDir = (dir: string): void =>
  rmSync(dir, { force: true, recursive: true });

const sampleEntry = (
  overrides: Partial<Parameters<MetadataStore["upsertEntry"]>[0]> = {}
) => ({
  contentHash: "content-hash-a",
  fileName: "abc.png",
  hash: "key-a",
  height: 100,
  sizeBytes: 1024,
  width: 200,
  ...overrides,
});

const touchLater = async (
  store: MetadataStore,
  hash: string
): Promise<void> => {
  // Ensure a strictly later timestamp than created_at, even under a fast
  // in-memory test where Date.now() resolution could otherwise tie.
  const { promise, resolve } = Promise.withResolvers<undefined>();
  setTimeout(resolve, 2);
  await promise;
  await store.touchAccess(hash, Date.now());
};

// ---------------------------------------------------------------------
// In-memory SQLite: the bulk of correctness tests. No disk I/O, fast.
// ---------------------------------------------------------------------

describe("MetadataStore (:memory:)", () => {
  let store: MetadataStore;

  beforeEach(async () => {
    store = new MetadataStore(":memory:");
    await store.init();
  });

  afterEach(() => {
    store.close();
  });

  it("starts with zeroed totals", async () => {
    const totals = await store.getTotals();
    expect(totals.entryCount).toBe(0);
    expect(totals.totalSizeBytes).toBe(0);
  });

  it("getEntry on an unknown hash returns null", async () => {
    expect(await store.getEntry("missing")).toBeNull();
  });

  it("upsertEntry inserts a new row retrievable by hash", async () => {
    await store.upsertEntry(sampleEntry());
    const row = await store.getEntry("key-a");

    expect(row).not.toBeNull();
    expect(row?.fileName).toBe("abc.png");
    expect(row?.sizeBytes).toBe(1024);
    expect(row?.contentHash).toBe("content-hash-a");
    expect(row?.createdAt).toBeGreaterThan(0);
    expect(row?.lastAccessedAt).toBe(row?.createdAt);
  });

  it("the running-total trigger updates entryCount and totalSizeBytes on insert -- no manual SUM needed", async () => {
    await store.upsertEntry(sampleEntry({ hash: "a", sizeBytes: 1000 }));
    await store.upsertEntry(sampleEntry({ hash: "b", sizeBytes: 2000 }));

    const totals = await store.getTotals();
    expect(totals.entryCount).toBe(2);
    expect(totals.totalSizeBytes).toBe(3000);
  });

  it("upsertEntry on an existing hash updates the row in place (re-render at a new size) and adjusts totals via the update trigger, not a stale insert+delete pair", async () => {
    await store.upsertEntry(sampleEntry({ hash: "a", sizeBytes: 1000 }));
    await store.upsertEntry(
      sampleEntry({ contentHash: "content-hash-b", hash: "a", sizeBytes: 1500 })
    );

    const row = await store.getEntry("a");
    expect(row?.sizeBytes).toBe(1500);
    expect(row?.contentHash).toBe("content-hash-b");

    const totals = await store.getTotals();
    // still one row, not two
    expect(totals.entryCount).toBe(1);
    // reflects the new size, not 1000+1500
    expect(totals.totalSizeBytes).toBe(1500);
  });

  it("deleteEntry removes the row and the delete trigger decrements totals", async () => {
    await store.upsertEntry(sampleEntry({ hash: "a", sizeBytes: 1000 }));
    await store.upsertEntry(sampleEntry({ hash: "b", sizeBytes: 2000 }));

    await store.deleteEntry("a");

    expect(await store.getEntry("a")).toBeNull();
    const totals = await store.getTotals();
    expect(totals.entryCount).toBe(1);
    expect(totals.totalSizeBytes).toBe(2000);
  });

  it("deleteEntry on a hash that doesn't exist is a safe no-op", async () => {
    await store.upsertEntry(sampleEntry({ hash: "a", sizeBytes: 1000 }));
    await store.deleteEntry("never-existed");

    const totals = await store.getTotals();
    expect(totals.entryCount).toBe(1);
    expect(totals.totalSizeBytes).toBe(1000);
  });

  it("deleteAll empties the table and the delete trigger fires per-row, zeroing totals correctly", async () => {
    for (let i = 0; i < 25; i += 1) {
      // oxlint-disable-next-line eslint/no-await-in-loop
      await store.upsertEntry(sampleEntry({ hash: `k${i}`, sizeBytes: 100 }));
    }
    await store.deleteAll();

    const totals = await store.getTotals();
    expect(totals.entryCount).toBe(0);
    expect(totals.totalSizeBytes).toBe(0);
    expect(await store.listAllOrderedByLastAccessed()).toEqual([]);
  });

  it("touchAccess updates last_accessed_at without touching size/totals", async () => {
    await store.upsertEntry(sampleEntry({ hash: "a", sizeBytes: 1000 }));
    const before = await store.getEntry("a");

    await touchLater(store, "a");

    const after = await store.getEntry("a");
    // oxlint-disable-next-line typescript/no-non-null-assertion
    expect(after?.lastAccessedAt).toBeGreaterThan(before!.lastAccessedAt);
    expect(after?.sizeBytes).toBe(1000);

    const totals = await store.getTotals();
    // untouched by touchAccess
    expect(totals.totalSizeBytes).toBe(1000);
  });

  it("listAllOrderedByLastAccessed returns entries oldest-first, honoring explicit touches", async () => {
    await store.upsertEntry(sampleEntry({ hash: "a" }));
    await store.upsertEntry(sampleEntry({ hash: "b" }));
    await store.upsertEntry(sampleEntry({ hash: "c" }));

    // Touch "a" so it's now the most recently accessed, despite being
    // inserted first.
    await store.touchAccess("a", Date.now() + 10_000);

    const rows = await store.listAllOrderedByLastAccessed();
    const hashesOldestFirst = rows.map((r) => r.hash);

    expect(hashesOldestFirst.at(-1)).toBe("a");
  });

  it("getTotals is O(1)-shaped: correct immediately after a large batch insert with no separate aggregation step required", async () => {
    const N = 500;
    for (let i = 0; i < N; i += 1) {
      // oxlint-disable-next-line eslint/no-await-in-loop
      await store.upsertEntry(
        sampleEntry({ hash: `bulk-${i}`, sizeBytes: 10 })
      );
    }
    const totals = await store.getTotals();
    expect(totals.entryCount).toBe(N);
    expect(totals.totalSizeBytes).toBe(N * 10);
  });

  it("throws a clear error if used before init()", async () => {
    const uninitialized = new MetadataStore(":memory:");
    await expect(uninitialized.getTotals()).rejects.toThrow(
      "MetadataStore.init() must be called before use."
    );
  });

  it("init() is idempotent -- calling it twice does not throw or reset state", async () => {
    await store.upsertEntry(sampleEntry({ hash: "a" }));
    // second call
    await store.init();
    expect(await store.getEntry("a")).not.toBeNull();
  });

  it("close() is idempotent -- calling it multiple times does not throw", () => {
    store.close();
    store.close();
    store.close();
  });

  it("supports close() followed by re-init() — full lifecycle", async () => {
    store.close();

    await store.init();
    await store.upsertEntry(sampleEntry({ hash: "cycle-2" }));
    expect(await store.getEntry("cycle-2")).not.toBeNull();
    store.close();
  });

  it("throws a clear error when used after close() — not a cryptic 'Database has closed'", async () => {
    store.close();
    await expect(store.getTotals()).rejects.toThrow(
      "MetadataStore.init() must be called before use."
    );
  });

  it("concurrent init() calls serialize — data persists across re-open", async () => {
    const dir = makeTempDir();
    const store2 = new MetadataStore(dir);
    await Promise.all([store2.init(), store2.init(), store2.init()]);
    await store2.upsertEntry(sampleEntry({ hash: "concurrent" }));
    expect(await store2.getEntry("concurrent")).not.toBeNull();
    store2.close();

    expect(existsSync(path.join(dir, "cache.sqlite"))).toBeTrue();

    const store3 = new MetadataStore(dir);
    await store3.init();
    expect(await store3.getEntry("concurrent")).not.toBeNull();
    store3.close();

    rmDir(dir);
  });

  it("trigger-maintained totals stay accurate under rapid insert/delete cycles", async () => {
    for (let cycle = 0; cycle < 50; cycle += 1) {
      for (let i = 0; i < 10; i += 1) {
        // oxlint-disable-next-line eslint/no-await-in-loop
        await store.upsertEntry(
          sampleEntry({ hash: `stress-${cycle}-${i}`, sizeBytes: 100 })
        );
      }
      for (let i = 0; i < 5; i += 1) {
        // oxlint-disable-next-line eslint/no-await-in-loop
        await store.deleteEntry(`stress-${cycle}-${i}`);
      }
    }

    const totals = await store.getTotals();
    expect(totals.entryCount).toBe(250);
    expect(totals.totalSizeBytes).toBe(250 * 100);
  });

  it("handles 2_000 entries and deleteAll — totals hit zero", async () => {
    for (let i = 0; i < 2000; i += 1) {
      // oxlint-disable-next-line eslint/no-await-in-loop
      await store.upsertEntry(
        sampleEntry({ hash: `mass-${i}`, sizeBytes: 10 })
      );
    }
    let totals = await store.getTotals();
    expect(totals.entryCount).toBe(2000);
    expect(totals.totalSizeBytes).toBe(20_000);

    await store.deleteAll();
    totals = await store.getTotals();
    expect(totals.entryCount).toBe(0);
    expect(totals.totalSizeBytes).toBe(0);
    expect(await store.listAllOrderedByLastAccessed()).toEqual([]);
  });
});

// ---------------------------------------------------------------------
// Real-disk tests: only what genuinely needs a file-backed database --
// WAL file behavior and multiple independent connections to the same file.
// ---------------------------------------------------------------------

describe("MetadataStore (real disk, WAL mode)", () => {
  let dir: string;

  beforeEach(() => {
    dir = makeTempDir();
  });

  afterEach(() => {
    rmDir(dir);
  });

  it("persists across separate MetadataStore instances pointed at the same directory", async () => {
    const storeA = new MetadataStore(dir);
    await storeA.init();
    await storeA.upsertEntry(sampleEntry({ hash: "persisted" }));
    storeA.close();

    const storeB = new MetadataStore(dir);
    await storeB.init();
    const row = await storeB.getEntry("persisted");
    storeB.close();

    expect(row).not.toBeNull();
    expect(row?.fileName).toBe("abc.png");
  });

  it("two concurrently-initialized instances on the same directory both succeed (WAL mode)", async () => {
    const storeA = new MetadataStore(dir);
    const storeB = new MetadataStore(dir);

    await Promise.all([storeA.init(), storeB.init()]);

    await storeA.upsertEntry(sampleEntry({ hash: "from-a" }));
    const seenFromB = await storeB.getEntry("from-a");

    expect(seenFromB).not.toBeNull();

    storeA.close();
    storeB.close();
  });

  it("creates the cache directory if it doesn't already exist", async () => {
    const freshDir = path.join(dir, "nested", "cache");
    const store = new MetadataStore(freshDir);
    await store.init();
    await store.upsertEntry(sampleEntry());
    expect(await store.getEntry("key-a")).not.toBeNull();
    store.close();
  });

  it("recovers from a corrupted database file via integrity check", async () => {
    const storeA = new MetadataStore(dir);
    await storeA.init();
    await storeA.upsertEntry(sampleEntry({ hash: "pre-corrupt" }));
    storeA.close();

    writeFileSync(path.join(dir, "cache.sqlite"), "garbage data");

    const storeB = new MetadataStore(dir);
    await storeB.init();

    expect(await storeB.getEntry("pre-corrupt")).toBeNull();
    const totals = await storeB.getTotals();
    expect(totals.entryCount).toBe(0);

    await storeB.upsertEntry(sampleEntry({ hash: "post-corrupt" }));
    expect(await storeB.getEntry("post-corrupt")).not.toBeNull();
    storeB.close();
  });
});
