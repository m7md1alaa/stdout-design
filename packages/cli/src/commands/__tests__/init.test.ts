import { describe, expect, test } from "bun:test";
import {
  existsSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";

import type { ScaffoldOptions } from "../init.js";
import { init, scaffold } from "../init.js";

const inTempDir = (): string => {
  const dir = mkdtempSync(path.join(tmpdir(), "studio-init-test-"));
  return dir;
};

const defaultOptions = (
  overrides?: Partial<ScaffoldOptions>
): ScaffoldOptions => ({
  git: false,
  install: false,
  locales: [],
  projectName: "test-project",
  templates: [],
  ...overrides,
});

describe("scaffold", () => {
  test("creates studio.config.ts with default options", async () => {
    const dir = inTempDir();

    await scaffold(dir, defaultOptions());

    expect(existsSync(path.join(dir, "studio.config.ts"))).toBe(true);
    const content = readFileSync(path.join(dir, "studio.config.ts"), "utf-8");
    expect(content).toContain("StudioConfig");
    expect(content).toContain("scaffoldVersion");

    rmSync(dir, { force: true, recursive: true });
  });

  test("scaffolds requested template files", async () => {
    const dir = inTempDir();

    await scaffold(
      dir,
      defaultOptions({
        templates: ["bento-feature"],
      })
    );

    expect(existsSync(path.join(dir, "templates", "bento-feature.tsx"))).toBe(
      true
    );
    const content = readFileSync(
      path.join(dir, "templates", "bento-feature.tsx"),
      "utf-8"
    );
    expect(content).toContain("defineSchema");
    expect(content).toContain("function BentoFeature");

    rmSync(dir, { force: true, recursive: true });
  });

  test("does not create templates dir when no templates selected", async () => {
    const dir = inTempDir();

    await scaffold(dir, defaultOptions());

    expect(existsSync(path.join(dir, "templates"))).toBe(false);

    rmSync(dir, { force: true, recursive: true });
  });

  test("scaffolds requested locale files", async () => {
    const dir = inTempDir();

    await scaffold(
      dir,
      defaultOptions({
        locales: ["en", "ar"],
      })
    );

    expect(existsSync(path.join(dir, "locales", "en.json"))).toBe(true);
    expect(existsSync(path.join(dir, "locales", "ar.json"))).toBe(true);

    const en = readFileSync(path.join(dir, "locales", "en.json"), "utf-8");
    expect(JSON.parse(en)).toEqual({ title: "Featured App" });

    rmSync(dir, { force: true, recursive: true });
  });

  test("does not create locales dir when no locales selected", async () => {
    const dir = inTempDir();

    await scaffold(dir, defaultOptions());

    expect(existsSync(path.join(dir, "locales"))).toBe(false);

    rmSync(dir, { force: true, recursive: true });
  });

  test("copies static assets like tsconfig.json, .gitignore, and types.d.ts", async () => {
    const dir = inTempDir();

    await scaffold(dir, defaultOptions());

    expect(existsSync(path.join(dir, "tsconfig.json"))).toBe(true);
    expect(existsSync(path.join(dir, ".gitignore"))).toBe(true);
    expect(existsSync(path.join(dir, "types.d.ts"))).toBe(true);

    rmSync(dir, { force: true, recursive: true });
  });

  test("copies types.d.ts with tw prop declaration for React JSX", async () => {
    const dir = inTempDir();

    await scaffold(dir, defaultOptions());

    const content = readFileSync(path.join(dir, "types.d.ts"), "utf-8");
    expect(content).toContain("declare module");
    expect(content).toContain("DOMAttributes");
    expect(content).toContain("tw?");

    rmSync(dir, { force: true, recursive: true });
  });

  test("generates package.json with project name and runtime deps", async () => {
    const dir = inTempDir();

    await scaffold(dir, defaultOptions({ projectName: "my-design" }));

    const pkg = JSON.parse(
      readFileSync(path.join(dir, "package.json"), "utf-8")
    );
    expect(pkg.name).toBe("my-design");
    expect(pkg.dependencies["@stdout-design/cli"]).toBeDefined();
    expect(pkg.dependencies["@stdout-design/dev-server"]).toBeDefined();
    expect(pkg.dependencies["@stdout-design/web-ui"]).toBeDefined();
    expect(pkg.dependencies["@types/react"]).toBeDefined();
    expect(pkg.dependencies["takumi-js"]).toBeUndefined();

    rmSync(dir, { force: true, recursive: true });
  });

  test("generates package.json with conventional key order", async () => {
    const dir = inTempDir();

    await scaffold(dir, defaultOptions({ projectName: "order-test" }));

    const pkg = JSON.parse(
      readFileSync(path.join(dir, "package.json"), "utf-8")
    );
    const keys = Object.keys(pkg);
    expect(keys).toEqual([
      "name",
      "private",
      "type",
      "scripts",
      "dependencies",
    ]);

    rmSync(dir, { force: true, recursive: true });
  });

  test("creates directory if it does not exist", async () => {
    const dir = path.join(tmpdir(), "studio-scaffold-new-dir-test");

    await scaffold(dir, defaultOptions());

    expect(existsSync(dir)).toBe(true);
    expect(existsSync(path.join(dir, "studio.config.ts"))).toBe(true);

    rmSync(dir, { force: true, recursive: true });
  });

  test("throws descriptive error for unknown template", async () => {
    const dir = inTempDir();

    await expect(
      scaffold(dir, defaultOptions({ templates: ["does-not-exist"] }))
    ).rejects.toThrow(/Template "does-not-exist" not found/u);

    rmSync(dir, { force: true, recursive: true });
  });

  test("falls back to default content for unknown locale", async () => {
    const dir = inTempDir();

    await scaffold(dir, defaultOptions({ locales: ["fr"] }));

    const fr = JSON.parse(
      readFileSync(path.join(dir, "locales", "fr.json"), "utf-8")
    );
    expect(fr).toEqual({ title: "Featured App" });

    rmSync(dir, { force: true, recursive: true });
  });

  test("throws descriptive error for empty projectName", async () => {
    const dir = inTempDir();

    await expect(
      scaffold(dir, defaultOptions({ projectName: "" }))
    ).rejects.toThrow(/Project name cannot be empty/u);

    rmSync(dir, { force: true, recursive: true });
  });

  test("overwrites files in already-existing target directory", async () => {
    const dir = inTempDir();
    const pkgPath = path.join(dir, "package.json");
    writeFileSync(pkgPath, JSON.stringify({ name: "old-name" }));

    await scaffold(dir, defaultOptions({ projectName: "new-name" }));

    const pkg = JSON.parse(readFileSync(pkgPath, "utf-8"));
    expect(pkg.name).toBe("new-name");

    rmSync(dir, { force: true, recursive: true });
  });

  test("throws when one of multiple templates does not exist", async () => {
    const dir = inTempDir();

    await expect(
      scaffold(
        dir,
        defaultOptions({ templates: ["bento-feature", "does-not-exist"] })
      )
    ).rejects.toThrow(/Template "does-not-exist" not found/u);

    expect(existsSync(path.join(dir, "templates", "bento-feature.tsx"))).toBe(
      false
    );

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

    await init(dir, { yes: true });

    expect(existsSync(path.join(dir, "studio.config.ts"))).toBe(true);

    rmSync(dir, { force: true, recursive: true });
  });

  test("with projectDir creates project with that name", async () => {
    const parentDir = inTempDir();
    const projectDir = "my-project";
    const fullPath = path.join(parentDir, projectDir);

    await init(fullPath, { yes: true });

    expect(existsSync(path.join(fullPath, "studio.config.ts"))).toBe(true);
    const pkg = JSON.parse(
      readFileSync(path.join(fullPath, "package.json"), "utf-8")
    );
    expect(pkg.name).toBe("my-project");

    rmSync(parentDir, { force: true, recursive: true });
  });

  test("returns early when studio.config.ts already exists", async () => {
    const dir = inTempDir();
    const configPath = path.join(dir, "studio.config.ts");
    writeFileSync(configPath, "// existing config");

    await init(dir, { yes: true });

    const content = readFileSync(configPath, "utf-8");
    expect(content).toBe("// existing config");

    rmSync(dir, { force: true, recursive: true });
  });
});
