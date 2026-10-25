import { describe, expect, test } from "bun:test";
import {
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";

import type { StarterId } from "../init/catalog.js";
import { buildProjectConfig } from "../init/project-config.js";
import { serializeConfig } from "../init/serialize-config.js";
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

// Writes the config `init` would have written for these choices.
const createInitConfig = (
  dir: string,
  version: string,
  choices: { locales: string[]; starters: StarterId[] }
): void => {
  writeFileSync(
    path.resolve(dir, "studio.config.ts"),
    serializeConfig(buildProjectConfig(version, choices))
  );
};

const createCurrentConfig = (dir: string): void => {
  createInitConfig(dir, "0.2.9", {
    locales: ["en"],
    starters: ["bento-feature"],
  });
};

const readJson = (dir: string, file: string) =>
  JSON.parse(readFileSync(path.resolve(dir, file), "utf-8"));

// Bun caches modules by path, and `update` already imported this one.
const readConfig = async (dir: string) => {
  const file = `${path.resolve(dir, "studio.config.ts")}?after=${Date.now()}`;
  const { default: config } = await import(file);
  return config;
};

const at = (version: string): UpdateDeps => ({
  getInstalledVersion: () => version,
  getLatestVersion: () => Promise.resolve(null),
});

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

describe("update after init", () => {
  test("leaves a project alone when the same version created it", async () => {
    const { logs, restore } = captureLogs();
    const dir = inTempDir();
    // English only, one starter: nothing for update to add.
    createInitConfig(dir, "0.7.0", {
      locales: ["en"],
      starters: ["launch-hero"],
    });

    try {
      const { update } = await import("../update.js");
      await update(dir, { yes: true }, at("0.7.0"));
      expect(logs.join(" ")).toContain("already up to date");
    } finally {
      restore();
      rmSync(dir, { force: true, recursive: true });
    }
  });

  test("adds the starters shipped since, with their files, copy and fonts", async () => {
    const { restore } = captureLogs();
    const dir = inTempDir();
    createInitConfig(dir, "0.6.0", {
      locales: ["en", "ar"],
      starters: ["bento-feature"],
    });
    mkdirSync(path.resolve(dir, "templates"));
    writeFileSync(path.resolve(dir, "templates/bento-feature.tsx"), "// mine");
    mkdirSync(path.resolve(dir, "locales"));
    const myCopy = { "bento-feature": { headline: "Mine" } };
    writeFileSync(path.resolve(dir, "locales/ar.json"), JSON.stringify(myCopy));

    try {
      const { update } = await import("../update.js");
      await update(dir, { yes: true }, at("0.7.0"));

      const config = await readConfig(dir);
      expect(Object.keys(config.templates).toSorted()).toEqual([
        "bento-feature",
        "launch-hero",
        "retro-poster",
        "trend-poster",
      ]);
      expect(
        config.fonts.ar.map((f: { family: string }) => f.family)
      ).toContain("Lalezar");
      expect(
        readFileSync(path.resolve(dir, "templates/launch-hero.tsx"), "utf-8")
      ).toContain("defineSchema");
      expect(
        readFileSync(path.resolve(dir, "templates/bento-feature.tsx"), "utf-8")
      ).toBe("// mine");
      const ar = readJson(dir, "locales/ar.json");
      expect(ar["bento-feature"]).toEqual({ headline: "Mine" });
      expect(ar).toHaveProperty(["launch-hero"]);
    } finally {
      restore();
      rmSync(dir, { force: true, recursive: true });
    }
  });

  test("records an older project's locales from its locale files", async () => {
    const { restore } = captureLogs();
    const dir = inTempDir();
    createMinimalConfig(dir);
    mkdirSync(path.resolve(dir, "locales"));
    writeFileSync(path.resolve(dir, "locales/en.json"), "{}");

    try {
      const { update } = await import("../update.js");
      await update(dir, { yes: true }, at("0.7.0"));

      const config = await readConfig(dir);
      expect(config.locales).toEqual(["en"]);
      expect(Object.keys(config.fonts)).toEqual(["default"]);
    } finally {
      restore();
      rmSync(dir, { force: true, recursive: true });
    }
  });
});
