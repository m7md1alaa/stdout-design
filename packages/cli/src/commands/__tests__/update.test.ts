import { describe, expect, test } from "bun:test";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";

import type { UpdateDeps } from "../update.js";

const inTempDir = () => {
  const dir = mkdtempSync(path.join(tmpdir(), "studio-update-test-"));
  return dir;
};

const createMinimalConfig = (dir: string): void => {
  const configContent = `import type { StudioConfig } from "@stdout-design/cli";

const config: StudioConfig = {
  scaffoldVersion: "0.2.8",
  presets: [],
  templates: {},
};

export default config;
`;
  writeFileSync(path.resolve(dir, "studio.config.ts"), configContent);
};

const createCurrentConfig = (dir: string): void => {
  const configContent = `import type { StudioConfig } from "@stdout-design/cli";

const config: StudioConfig = {
  scaffoldVersion: "0.2.9",
  defaultPreset: "instagram-square",
  presets: [
    { height: 1080, id: "instagram-square", platform: "instagram", width: 1080 },
    { height: 1200, id: "x-card", platform: "x", width: 1200 },
  ],
  templates: {
    "bento-feature": {
      componentPath: "./templates/bento-feature",
      description: "Apple-style bento feature card.",
    },
  },
};

export default config;
`;
  writeFileSync(path.resolve(dir, "studio.config.ts"), configContent);
};

const captureLogs = () => {
  const logs: string[] = [];
  const origLog = console.log;
  console.log = (...args: unknown[]) => {
    logs.push(args.join(" "));
  };
  return { logs, restore: () => (console.log = origLog) };
};

describe("update", () => {
  test("throws when studio.config.ts does not exist", async () => {
    const dir = inTempDir();

    try {
      const { update } = await import("../update.js");
      await expect(update(dir)).rejects.toThrow("No studio.config.ts found in");
    } finally {
      rmSync(dir, { force: true, recursive: true });
    }
  });

  test("prints upgrade message when npm latest exceeds installed version", async () => {
    const deps: UpdateDeps = {
      getInstalledVersion: () => "0.2.8",
      getLatestVersion: () => Promise.resolve("0.2.9"),
    };

    const { logs, restore } = captureLogs();
    const dir = inTempDir();
    createMinimalConfig(dir);

    try {
      const { update } = await import("../update.js");
      await update(dir, { yes: true }, deps);
      const combined = logs.join(" ");
      expect(combined.includes("0.2.8")).toBe(true);
      expect(combined.includes("0.2.9")).toBe(true);
      expect(combined.includes("npm install")).toBe(true);
    } finally {
      restore();
      rmSync(dir, { force: true, recursive: true });
    }
  });

  test("proceeds normally when npm latest equals installed version", async () => {
    const deps: UpdateDeps = {
      getInstalledVersion: () => "0.2.9",
      getLatestVersion: () => Promise.resolve("0.2.9"),
    };

    const { logs, restore } = captureLogs();
    const dir = inTempDir();
    createCurrentConfig(dir);

    try {
      const { update } = await import("../update.js");
      await update(dir, { yes: true }, deps);
      const combined = logs.join(" ");
      expect(combined.includes("already up to date")).toBe(true);
      expect(combined.includes("npm install")).toBe(false);
    } finally {
      restore();
      rmSync(dir, { force: true, recursive: true });
    }
  });

  test("falls back to installed version when npm registry is unreachable", async () => {
    const deps: UpdateDeps = {
      getInstalledVersion: () => "0.2.9",
      getLatestVersion: () => Promise.resolve(null),
    };

    const { logs, restore } = captureLogs();
    const dir = inTempDir();
    createCurrentConfig(dir);

    try {
      const { update } = await import("../update.js");
      await update(dir, { yes: true }, deps);
      const combined = logs.join(" ");
      expect(combined.includes("already up to date")).toBe(true);
      expect(combined.includes("npm install")).toBe(false);
    } finally {
      restore();
      rmSync(dir, { force: true, recursive: true });
    }
  });
});
