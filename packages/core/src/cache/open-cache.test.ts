import { describe, expect, it } from "bun:test";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";

import { openCache } from "./open-cache.js";

describe("openCache", () => {
  it("returns an initialized cache using the default project cache directory", async () => {
    const rootDir = mkdtempSync(path.join(tmpdir(), "open-cache-test-"));

    try {
      const cache = await openCache(rootDir);

      const stats = await cache.stats();
      expect(stats.cacheDir).toBe(path.resolve(rootDir, ".studio-cache"));
      expect(stats.pixels.maxSizeBytes).toBe(500 * 1024 * 1024);

      cache.close();
    } finally {
      rmSync(rootDir, { force: true, recursive: true });
    }
  });

  it("uses a custom cache directory when one is provided", async () => {
    const rootDir = mkdtempSync(path.join(tmpdir(), "open-cache-test-"));
    const customDir = path.join(rootDir, "custom-cache");

    try {
      const cache = await openCache(rootDir, { cacheDir: customDir });

      const stats = await cache.stats();
      expect(stats.cacheDir).toBe(customDir);

      cache.close();
    } finally {
      rmSync(rootDir, { force: true, recursive: true });
    }
  });

  it("applies a custom max size when maxSizeMB is provided", async () => {
    const rootDir = mkdtempSync(path.join(tmpdir(), "open-cache-test-"));

    try {
      const cache = await openCache(rootDir, { maxSizeMB: 42 });

      const stats = await cache.stats();
      expect(stats.pixels.maxSizeBytes).toBe(42 * 1024 * 1024);

      cache.close();
    } finally {
      rmSync(rootDir, { force: true, recursive: true });
    }
  });
});
