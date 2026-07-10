import { afterEach, describe, expect, it, mock } from "bun:test";
import { existsSync, mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";

mock.module("takumi-js/helpers/jsx", () => ({
  fromJsx: mock(() =>
    Promise.resolve({
      node: { type: "container" },
      stylesheets: [] as string[],
    })
  ),
}));

class MockRenderer {
  render = mock(() => Promise.resolve(Buffer.from("rendered")));
  measure = mock(() =>
    Promise.resolve({
      children: [] as [],
      height: 100,
      runs: [] as [],
      transform: [1, 0, 0, 1, 0, 0] as [
        number,
        number,
        number,
        number,
        number,
        number,
      ],
      width: 200,
    })
  );
  registerFont = mock(() => Promise.resolve([]));
}

mock.module("takumi-js/node", () => ({ Renderer: MockRenderer }));

const { runBatch } = await import("../batch/batch.js");

const fixturesRoot = path.join(import.meta.dir, "fixtures");

describe("runBatch", () => {
  let tmpDir = "";

  afterEach(() => {
    if (tmpDir) {
      try {
        rmSync(tmpDir, { force: true, recursive: true });
      } catch {
        // cleanup best-effort
      }
      tmpDir = "";
    }
  });

  it("renders two rows with one preset and returns a manifest", async () => {
    tmpDir = mkdtempSync(path.join(tmpdir(), "stdout-batch-"));

    const result = await runBatch({
      cacheDir: tmpDir,
      dataFile: "./data/rows.json",
      locales: [],
      outDir: tmpDir,
      presets: ["small"],
      rootDir: fixturesRoot,
      templateId: "test-card",
    });

    expect(result.manifest.status).toBe("completed");
    expect(result.manifest.completedCount).toBe(2);
    expect(result.manifest.totalCount).toBe(2);
    expect(result.manifest.succeeded).toHaveLength(2);
    expect(result.manifest.failed).toHaveLength(0);
    expect(result.elapsedMs).toBeGreaterThan(0);

    const manifestPath = path.join(tmpDir, "manifest.json");
    expect(existsSync(manifestPath)).toBe(true);

    const [firstSucceeded] = result.manifest.succeeded;
    expect(firstSucceeded).toBeDefined();
    if (!firstSucceeded) {
      throw new Error("Expected at least one succeeded entry");
    }
    expect(existsSync(firstSucceeded.outputPath)).toBe(true);
    expect(firstSucceeded.outputPath).toContain(tmpDir);
    expect(firstSucceeded.cacheHit).toBe(false);
  });

  it("respects presets filter when narrowing to one preset", async () => {
    tmpDir = mkdtempSync(path.join(tmpdir(), "stdout-batch-"));

    const result = await runBatch({
      cacheDir: tmpDir,
      dataFile: "./data/rows.json",
      locales: [],
      outDir: tmpDir,
      presets: ["medium"],
      rootDir: fixturesRoot,
      templateId: "test-card",
    });

    expect(result.manifest.succeeded).toHaveLength(2);
    for (const entry of result.manifest.succeeded) {
      expect(entry.preset).toBe("medium");
    }
  });

  it("expands matrix across locales and produces locale-specific files", async () => {
    tmpDir = mkdtempSync(path.join(tmpdir(), "stdout-batch-"));

    const result = await runBatch({
      cacheDir: tmpDir,
      dataFile: "./data/rows.json",
      locales: ["en"],
      outDir: tmpDir,
      presets: ["small"],
      rootDir: fixturesRoot,
      templateId: "test-card",
    });

    const locales = new Set(result.manifest.succeeded.map((e) => e.locale));
    expect(locales.has("en")).toBe(true);
  });

  it("fails with a descriptive error for a missing templateId", async () => {
    tmpDir = mkdtempSync(path.join(tmpdir(), "stdout-batch-"));

    await expect(
      runBatch({
        dataFile: "./data/rows.json",
        outDir: tmpDir,
        rootDir: fixturesRoot,
        templateId: "nonexistent",
      })
    ).rejects.toThrow("Template not found");
  });
});
