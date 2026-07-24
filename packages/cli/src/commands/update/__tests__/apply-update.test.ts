import { describe, expect, test } from "bun:test";
import {
  existsSync,
  mkdtempSync,
  rmSync,
  writeFileSync,
  readFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";

import type { StudioConfig } from "@stdout-design/core";

import type { Defaults } from "../../init/merge-config.js";
import { applyUpdate, planUpdate } from "../../update.js";

const defaults: Defaults = {
  defaultPreset: "instagram-square",
  presets: [
    {
      height: 1080,
      id: "instagram-square",
      platform: "instagram",
      width: 1080,
    },
    { height: 1200, id: "x-card", platform: "x", width: 1200 },
  ],
  templates: {
    "bento-feature": {
      componentPath: "./templates/bento-feature",
      description: "Apple-style bento feature card.",
    },
  },
};

const inTempDir = () => {
  const dir = mkdtempSync(path.join(tmpdir(), "apply-update-test-"));
  return dir;
};

describe("applyUpdate", () => {
  test("writes studio.config.ts with merged config", async () => {
    const dir = inTempDir();
    try {
      const existing: StudioConfig = {
        presets: [],
        scaffoldVersion: "0.1.0",
        templates: {},
      };
      const plan = planUpdate(existing, defaults, "0.2.0", new Set());

      await applyUpdate(dir, plan);

      const configPath = path.resolve(dir, "studio.config.ts");
      expect(existsSync(configPath)).toBe(true);

      const content = readFileSync(configPath, "utf-8");
      expect(content).toContain("0.2.0");
      expect(content).toContain("instagram-square");
    } finally {
      rmSync(dir, { force: true, recursive: true });
    }
  });

  test("copies static assets", async () => {
    const dir = inTempDir();
    try {
      const existing: StudioConfig = {
        presets: [],
        scaffoldVersion: "0.1.0",
        templates: {},
      };
      const plan = planUpdate(existing, defaults, "0.2.0", new Set());

      await applyUpdate(dir, plan);

      expect(existsSync(path.resolve(dir, "tsconfig.json"))).toBe(true);
      expect(existsSync(path.resolve(dir, ".gitignore"))).toBe(true);
      expect(existsSync(path.resolve(dir, "types.d.ts"))).toBe(true);
    } finally {
      rmSync(dir, { force: true, recursive: true });
    }
  });

  test("updates @stdout-design/cli dep in package.json", async () => {
    const dir = inTempDir();
    try {
      const pkg = { dependencies: { "@stdout-design/cli": "^0.1.0" } };
      writeFileSync(
        path.resolve(dir, "package.json"),
        JSON.stringify(pkg, null, 2)
      );

      const existing: StudioConfig = {
        presets: [],
        scaffoldVersion: "0.1.0",
        templates: {},
      };
      const plan = planUpdate(existing, defaults, "0.2.0", new Set());

      await applyUpdate(dir, plan);

      const updated = JSON.parse(
        readFileSync(path.resolve(dir, "package.json"), "utf-8")
      );
      expect(updated.dependencies["@stdout-design/cli"]).toBe("^0.2.0");
    } finally {
      rmSync(dir, { force: true, recursive: true });
    }
  });

  test("leaves package.json unchanged when dep is already current", async () => {
    const dir = inTempDir();
    try {
      const pkg = {
        dependencies: { "@stdout-design/cli": "^0.2.0" },
        name: "test",
      };
      writeFileSync(
        path.resolve(dir, "package.json"),
        JSON.stringify(pkg, null, 2)
      );

      const existing: StudioConfig = {
        presets: [],
        scaffoldVersion: "0.2.0",
        templates: {},
      };
      const plan = planUpdate(existing, defaults, "0.2.0", new Set());

      await applyUpdate(dir, plan);

      const updated = JSON.parse(
        readFileSync(path.resolve(dir, "package.json"), "utf-8")
      );
      expect(updated.name).toBe("test");
      expect(updated.dependencies["@stdout-design/cli"]).toBe("^0.2.0");
    } finally {
      rmSync(dir, { force: true, recursive: true });
    }
  });

  test("handles missing package.json gracefully", async () => {
    const dir = inTempDir();
    try {
      const existing: StudioConfig = {
        presets: [],
        scaffoldVersion: "0.1.0",
        templates: {},
      };
      const plan = planUpdate(existing, defaults, "0.2.0", new Set());

      await applyUpdate(dir, plan);

      expect(existsSync(path.resolve(dir, "studio.config.ts"))).toBe(true);
    } finally {
      rmSync(dir, { force: true, recursive: true });
    }
  });
});
