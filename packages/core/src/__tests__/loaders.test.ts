import { afterEach, describe, expect, it } from "bun:test";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";

import {
  importTemplateForBatch,
  loadConfig,
  parseDataFile,
  resolveLocales,
} from "../batch/loaders.js";

const fixturesRoot = path.join(import.meta.dir, "fixtures");

describe("loaders", () => {
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

  describe("loadConfig", () => {
    it("loads and parses a valid studio.config.ts", async () => {
      const config = await loadConfig(fixturesRoot);

      expect(config.presets).toBeDefined();
      expect(config.presets.length).toBeGreaterThan(0);
      expect(config.templates).toBeDefined();
      expect(config.templates["test-card"]).toBeDefined();
      expect(config.templates["test-card"]?.componentPath).toBe(
        "./templates/test-card"
      );
    });

    it("throws CONFIG_NOT_FOUND when no studio.config.ts exists", async () => {
      tmpDir = mkdtempSync(path.join(tmpdir(), "stdout-loader-"));
      await expect(loadConfig(tmpDir)).rejects.toThrow(
        "No studio.config.ts found"
      );
    });

    it("throws CONFIG_INVALID for a config missing required fields", async () => {
      tmpDir = mkdtempSync(path.join(tmpdir(), "stdout-loader-"));
      writeFileSync(
        path.join(tmpDir, "studio.config.ts"),
        "export default { presets: [] };"
      );

      await expect(loadConfig(tmpDir)).rejects.toThrow(
        "studio.config.ts is invalid"
      );
    });
  });

  describe("importTemplateForBatch", () => {
    it("loads a template module from a component path", async () => {
      const result = await importTemplateForBatch(
        fixturesRoot,
        "./templates/test-card",
        "test-card"
      );

      expect(result.module).toBeDefined();
      expect(typeof result.module.default).toBe("function");
      expect(result.module.propsSchema).toBeDefined();
      expect(result.contentHash).toBeDefined();
      expect(result.contentHash.length).toBe(16);
    });

    it("caches subsequent imports (same path returns cached)", async () => {
      const first = await importTemplateForBatch(
        fixturesRoot,
        "./templates/test-card",
        "test-card"
      );

      const second = await importTemplateForBatch(
        fixturesRoot,
        "./templates/test-card",
        "test-card"
      );

      expect(first.contentHash).toBe(second.contentHash);
    });

    it("throws TEMPLATE_LOAD_FAILED for a non-existent component path", async () => {
      await expect(
        importTemplateForBatch(
          fixturesRoot,
          "./templates/nonexistent",
          "nonexistent"
        )
      ).rejects.toThrow("Template file not found");
    });

    it("throws TEMPLATE_INVALID_EXPORT when the module has no default export", async () => {
      tmpDir = mkdtempSync(path.join(tmpdir(), "stdout-loader-"));
      const tplDir = path.join(tmpDir, "templates");
      const { mkdirSync } = await import("node:fs");
      mkdirSync(tplDir, { recursive: true });
      writeFileSync(
        path.join(tplDir, "bad-default.tsx"),
        "export const propsSchema = null;"
      );

      writeFileSync(
        path.join(tmpDir, "studio.config.ts"),
        JSON.stringify({
          default: {
            presets: [{ height: 100, id: "s", platform: "x", width: 100 }],
            templates: {
              "bad-default": { componentPath: "./templates/bad-default" },
            },
          },
        })
      );

      await expect(
        importTemplateForBatch(tmpDir, "./templates/bad-default", "bad-default")
      ).rejects.toThrow("must have a default export");
    });

    it("throws TEMPLATE_INVALID_EXPORT when the module has no propsSchema", async () => {
      tmpDir = mkdtempSync(path.join(tmpdir(), "stdout-loader-"));
      const tplDir = path.join(tmpDir, "templates");
      const { mkdirSync } = await import("node:fs");
      mkdirSync(tplDir, { recursive: true });
      writeFileSync(
        path.join(tplDir, "no-schema.tsx"),
        "export default function NoSchema() { return null; }"
      );

      writeFileSync(
        path.join(tmpDir, "studio.config.ts"),
        JSON.stringify({
          default: {
            presets: [{ height: 100, id: "s", platform: "x", width: 100 }],
            templates: {
              "no-schema": { componentPath: "./templates/no-schema" },
            },
          },
        })
      );

      await expect(
        importTemplateForBatch(tmpDir, "./templates/no-schema", "no-schema")
      ).rejects.toThrow('must export a "propsSchema"');
    });
  });

  describe("parseDataFile", () => {
    it("parses a JSON array of objects", async () => {
      tmpDir = mkdtempSync(path.join(tmpdir(), "stdout-loader-"));
      const jsonPath = path.join(tmpDir, "data.json");
      writeFileSync(
        jsonPath,
        JSON.stringify([{ label: "one" }, { label: "two" }])
      );

      const rows = await parseDataFile(jsonPath);

      expect(rows).toHaveLength(2);
      expect(rows[0]?.label).toBe("one");
      expect(rows[1]?.label).toBe("two");
    });

    it("throws for a JSON file that is not an array", async () => {
      tmpDir = mkdtempSync(path.join(tmpdir(), "stdout-loader-"));
      const jsonPath = path.join(tmpDir, "data.json");
      writeFileSync(jsonPath, JSON.stringify({ label: "not-an-array" }));

      await expect(parseDataFile(jsonPath)).rejects.toThrow(
        "JSON data file must contain an array"
      );
    });

    it("parses a CSV file into rows", async () => {
      tmpDir = mkdtempSync(path.join(tmpdir(), "stdout-loader-"));
      const csvPath = path.join(tmpDir, "data.csv");
      writeFileSync(csvPath, "label,stat\nfirst,100\nsecond,200");

      const rows = await parseDataFile(csvPath);

      expect(rows).toHaveLength(2);
      expect(rows[0]?.label).toBe("first");
      expect(rows[0]?.stat).toBe("100");
      expect(rows[1]?.label).toBe("second");
      expect(rows[1]?.stat).toBe("200");
    });

    it("throws for an unsupported file extension", async () => {
      tmpDir = mkdtempSync(path.join(tmpdir(), "stdout-loader-"));
      const txtPath = path.join(tmpDir, "data.txt");
      writeFileSync(txtPath, "label\nfirst");

      await expect(parseDataFile(txtPath)).rejects.toThrow(
        "Data file must be .csv or .json"
      );
    });
  });

  describe("resolveLocales", () => {
    it("returns default locale entry when localeCodes is empty", async () => {
      tmpDir = mkdtempSync(path.join(tmpdir(), "stdout-loader-"));

      const entries = await resolveLocales(tmpDir, [], "any-template");

      expect(entries).toHaveLength(1);
      expect(entries[0]?.id).toBe("default");
      expect(entries[0]?.data).toBeUndefined();
    });

    it("loads locale data for recognized locales", async () => {
      const entries = await resolveLocales(fixturesRoot, ["en"], "test-card");

      expect(entries).toHaveLength(1);
      expect(entries[0]?.id).toBe("en");
    });

    it("returns locale entries without data for missing locale files", async () => {
      tmpDir = mkdtempSync(path.join(tmpdir(), "stdout-loader-"));
      const { mkdirSync } = await import("node:fs");
      const localesDir = path.join(tmpDir, "locales");
      mkdirSync(localesDir, { recursive: true });

      writeFileSync(
        path.join(tmpDir, "studio.config.ts"),
        JSON.stringify({
          default: {
            locales: ["en", "fr"],
            presets: [{ height: 100, id: "s", platform: "x", width: 100 }],
            templates: { test: { componentPath: "./templates/test" } },
          },
        })
      );

      const entries = await resolveLocales(tmpDir, ["en", "fr"], "test");

      expect(entries).toHaveLength(2);
      expect(entries[0]?.id).toBe("en");
      expect(entries[1]?.id).toBe("fr");
    });
  });
});
