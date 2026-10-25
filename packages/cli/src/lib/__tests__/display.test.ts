import { describe, expect, test } from "bun:test";

import type { CacheStats, Manifest } from "@stdout-design/core";

import {
  formatCacheCleanResult,
  formatCacheStats,
  formatError,
  formatManifestSummary,
} from "../display.js";

describe("formatCacheStats", () => {
  const baseStats: CacheStats = {
    cacheDir: "/tmp/cache",
    compiled: { entries: 5 },
    pixels: { entries: 10, maxSizeBytes: 104_857_600, sizeBytes: 2048 },
  };

  test("formats basic stats correctly", () => {
    const result = formatCacheStats(baseStats);
    expect(result).toContain("Cache Statistics");
    expect(result).toContain("/tmp/cache");
    expect(result).toContain("5 entries");
    expect(result).toContain("10 entries");
    expect(result).toContain("2.0 KB");
    expect(result).toContain("100.0 MB");
  });

  test("formats zero entries", () => {
    const stats: CacheStats = {
      cacheDir: "/cache",
      compiled: { entries: 0 },
      pixels: { entries: 0, maxSizeBytes: 0, sizeBytes: 0 },
    };
    const result = formatCacheStats(stats);
    expect(result).toContain("0 entries");
    expect(result).toContain("0 B");
    expect(result).toContain("0 B");
  });

  test("formats bytes in B range", () => {
    const stats: CacheStats = {
      cacheDir: "/cache",
      compiled: { entries: 1 },
      pixels: { entries: 1, maxSizeBytes: 1023, sizeBytes: 512 },
    };
    const result = formatCacheStats(stats);
    expect(result).toContain("512 B");
    expect(result).toContain("1023 B");
  });

  test("formats bytes in MB range", () => {
    const stats: CacheStats = {
      cacheDir: "/cache",
      compiled: { entries: 0 },
      pixels: { entries: 0, maxSizeBytes: 5_242_880, sizeBytes: 2_097_152 },
    };
    const result = formatCacheStats(stats);
    expect(result).toContain("2.0 MB");
    expect(result).toContain("5.0 MB");
  });

  test("formats bytes in GB range", () => {
    const stats: CacheStats = {
      cacheDir: "/cache",
      compiled: { entries: 0 },
      pixels: {
        entries: 0,
        maxSizeBytes: 6_442_450_944,
        sizeBytes: 3_221_225_472,
      },
    };
    const result = formatCacheStats(stats);
    expect(result).toContain("3.00 GB");
    expect(result).toContain("6.00 GB");
  });
});

describe("formatManifestSummary", () => {
  const succeededEntry = {
    cacheHit: true,
    locale: "en",
    outputPath: "output/image.png",
    preset: "square",
    rowIndex: 1,
  };

  const failedEntry = {
    error: "Render timeout",
    locale: "en",
    preset: "square",
    rowIndex: 1,
  };

  test("formats completed manifest with succeeded entries", () => {
    const manifest: Manifest = {
      completedCount: 1,
      failed: [],
      status: "completed",
      succeeded: [succeededEntry],
      totalCount: 1,
    };
    const result = formatManifestSummary(manifest);
    expect(result).toContain("Rendered 1 image of 1 (1 from cache)");
    expect(result).toContain("output/image.png");
  });

  test("omits Output files section when succeeded is empty", () => {
    const manifest: Manifest = {
      completedCount: 0,
      failed: [],
      status: "completed",
      succeeded: [],
      totalCount: 0,
    };
    const result = formatManifestSummary(manifest);
    expect(result).not.toContain("Rendered");
    expect(result).toContain("Nothing to render");
  });

  test("lists the first 10 files and summarizes the rest", () => {
    const manySucceeded = Array.from({ length: 11 }, (_, i) => ({
      cacheHit: false,
      locale: "en",
      outputPath: `output/${i}.png`,
      preset: "square",
      rowIndex: i,
    }));
    const manifest: Manifest = {
      completedCount: 11,
      failed: [],
      status: "completed",
      succeeded: manySucceeded,
      totalCount: 11,
    };
    const result = formatManifestSummary(manifest);
    expect(result).toContain("output/9.png");
    expect(result).not.toContain("output/10.png");
    expect(result).toContain("and 1 more");
  });

  test("shows output paths relative to cwd", () => {
    const manifest: Manifest = {
      completedCount: 1,
      failed: [],
      status: "completed",
      succeeded: [{ ...succeededEntry, outputPath: "/proj/out/a.png" }],
      totalCount: 1,
    };
    const result = formatManifestSummary(manifest, "/proj");
    expect(result).toContain("  out/a.png");
    expect(result).not.toContain("/proj/out/a.png");
  });

  test("includes cache hit count", () => {
    const manifest: Manifest = {
      completedCount: 3,
      failed: [],
      status: "completed",
      succeeded: [
        { ...succeededEntry, cacheHit: true },
        { ...succeededEntry, cacheHit: false, rowIndex: 2 },
        { ...succeededEntry, cacheHit: true, rowIndex: 3 },
      ],
      totalCount: 3,
    };
    const result = formatManifestSummary(manifest);
    expect(result).toContain("Rendered 3 images of 3 (2 from cache)");
  });

  test("includes Failures section when there are failures", () => {
    const manifest: Manifest = {
      completedCount: 1,
      failed: [failedEntry],
      status: "completed",
      succeeded: [succeededEntry],
      totalCount: 2,
    };
    const result = formatManifestSummary(manifest);
    expect(result).toContain("1 render failed:");
    expect(result).toContain("[square, en, row 1] Render timeout");
  });

  test("omits Failures section when failed is empty", () => {
    const manifest: Manifest = {
      completedCount: 1,
      failed: [],
      status: "completed",
      succeeded: [succeededEntry],
      totalCount: 1,
    };
    const result = formatManifestSummary(manifest);
    expect(result).not.toContain("failed");
  });

  test("shows aborted status", () => {
    const manifest: Manifest = {
      completedCount: 2,
      failed: [failedEntry],
      status: "aborted",
      succeeded: [
        { ...succeededEntry, cacheHit: false },
        { ...succeededEntry, cacheHit: false, rowIndex: 2 },
      ],
      totalCount: 10,
    };
    const result = formatManifestSummary(manifest);
    expect(result).toContain("aborted");
    expect(result).toContain("7 skipped");
    expect(result).toContain("Rendered 2 images of 10");
  });

  test("renders multiple failed entries", () => {
    const manifest: Manifest = {
      completedCount: 1,
      failed: [
        failedEntry,
        { error: "Missing font", locale: "ar", preset: "wide", rowIndex: 2 },
      ],
      status: "completed",
      succeeded: [succeededEntry],
      totalCount: 3,
    };
    const result = formatManifestSummary(manifest);
    expect(result).toContain("2 renders failed:");
    expect(result).toContain("[square, en, row 1] Render timeout");
    expect(result).toContain("[wide, ar, row 2] Missing font");
  });
});

describe("formatError", () => {
  test("formats Error instance with message", () => {
    const result = formatError(new Error("Something went wrong"));
    expect(result).toBe("Error: Something went wrong");
  });

  test("formats string value", () => {
    const result = formatError("raw error string");
    expect(result).toBe("Error: raw error string");
  });

  test("formats number value", () => {
    const result = formatError(42);
    expect(result).toBe("Error: 42");
  });

  test("formats null", () => {
    const result = formatError(null);
    expect(result).toBe("Error: null");
  });

  test("formats undefined", () => {
    const result = formatError();
    expect(result).toBe("Error: undefined");
  });

  test("formats object without message", () => {
    const result = formatError({ foo: "bar" });
    expect(result).toBe("Error: [object Object]");
  });

  test("uses Error.message, not the whole Error", () => {
    const result = formatError(new Error("kaboom"));
    expect(result).not.toContain("Error: Error: kaboom");
    expect(result).toBe("Error: kaboom");
  });
});

describe("formatCacheCleanResult", () => {
  test("formats zero bytes", () => {
    const result = formatCacheCleanResult(0);
    expect(result).toBe("Cache cleared. Freed 0 B.");
  });

  test("formats bytes in B range", () => {
    const result = formatCacheCleanResult(512);
    expect(result).toBe("Cache cleared. Freed 512 B.");
  });

  test("formats bytes in KB range", () => {
    const result = formatCacheCleanResult(2048);
    expect(result).toBe("Cache cleared. Freed 2.0 KB.");
  });

  test("formats bytes in MB range", () => {
    const result = formatCacheCleanResult(3_145_728);
    expect(result).toBe("Cache cleared. Freed 3.0 MB.");
  });

  test("formats bytes in GB range", () => {
    const result = formatCacheCleanResult(4_294_967_296);
    expect(result).toBe("Cache cleared. Freed 4.00 GB.");
  });

  test("formats 1 byte exactly", () => {
    const result = formatCacheCleanResult(1);
    expect(result).toBe("Cache cleared. Freed 1 B.");
  });

  test("formats 1023 bytes as B (below KB threshold)", () => {
    const result = formatCacheCleanResult(1023);
    expect(result).toBe("Cache cleared. Freed 1023 B.");
  });
});
