import { describe, expect, test } from "bun:test";
import { existsSync, mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";

import type { ScaffoldOptions } from "../init.js";
import { init, scaffold } from "../init.js";

const inTempDir = (): string => {
  const dir = mkdtempSync(path.join(tmpdir(), "studio-init-test-"));
  return dir;
};

describe("scaffold", () => {
  test("creates studio.config.ts with default options", async () => {
    const dir = inTempDir();

    const options: ScaffoldOptions = {
      install: false,
      locales: [],
      templates: [],
    };
    await scaffold(dir, options);

    expect(existsSync(path.join(dir, "studio.config.ts"))).toBe(true);
    const content = readFileSync(path.join(dir, "studio.config.ts"), "utf-8");
    expect(content).toContain("StudioConfig");

    rmSync(dir, { force: true, recursive: true });
  });

  test("scaffolds requested template files", async () => {
    const dir = inTempDir();

    await scaffold(dir, {
      install: false,
      locales: [],
      templates: ["bento-feature"],
    });

    expect(existsSync(path.join(dir, "templates", "bento-feature.tsx"))).toBe(
      true
    );
    const content = readFileSync(
      path.join(dir, "templates", "bento-feature.tsx"),
      "utf-8"
    );
    expect(content).toContain("defineSchema");
    expect(content).toContain("TakumiNode");

    rmSync(dir, { force: true, recursive: true });
  });

  test("does not create templates dir when no templates selected", async () => {
    const dir = inTempDir();

    await scaffold(dir, { install: false, locales: [], templates: [] });

    expect(existsSync(path.join(dir, "templates"))).toBe(false);

    rmSync(dir, { force: true, recursive: true });
  });

  test("scaffolds requested locale files", async () => {
    const dir = inTempDir();

    await scaffold(dir, {
      install: false,
      locales: ["en", "ar"],
      templates: [],
    });

    expect(existsSync(path.join(dir, "locales", "en.json"))).toBe(true);
    expect(existsSync(path.join(dir, "locales", "ar.json"))).toBe(true);

    const en = readFileSync(path.join(dir, "locales", "en.json"), "utf-8");
    expect(JSON.parse(en)).toEqual({ title: "Featured App" });

    rmSync(dir, { force: true, recursive: true });
  });

  test("does not create locales dir when no locales selected", async () => {
    const dir = inTempDir();

    await scaffold(dir, { install: false, locales: [], templates: [] });

    expect(existsSync(path.join(dir, "locales"))).toBe(false);

    rmSync(dir, { force: true, recursive: true });
  });

  test("scaffolds without crash when install is true", async () => {
    const dir = inTempDir();

    await scaffold(dir, {
      install: true,
      locales: [],
      templates: [],
    });

    expect(existsSync(path.join(dir, "studio.config.ts"))).toBe(true);

    rmSync(dir, { force: true, recursive: true });
  });
});

describe("init", () => {
  test("with --yes scaffolds all defaults without prompting", async () => {
    const dir = inTempDir();

    await init(dir, { yes: true });

    expect(existsSync(path.join(dir, "studio.config.ts"))).toBe(true);
    expect(existsSync(path.join(dir, "templates", "bento-feature.tsx"))).toBe(
      true
    );
    expect(existsSync(path.join(dir, "locales", "en.json"))).toBe(true);
    expect(existsSync(path.join(dir, "locales", "ar.json"))).toBe(true);

    rmSync(dir, { force: true, recursive: true });
  });

  test("with --yes does not prompt even when no tty", async () => {
    const dir = inTempDir();

    // Should not throw about prompts in non-TTY since --yes skips them
    await init(dir, { yes: true });

    expect(existsSync(path.join(dir, "studio.config.ts"))).toBe(true);

    rmSync(dir, { force: true, recursive: true });
  });
});
