import { it, expect } from "bun:test";
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";

import { resolveStudioRoot } from "../serve.js";

it("returns the ancestor directory that contains studio.config.ts when cwd has none", () => {
  const root = mkdtempSync(path.join(tmpdir(), "studio-root-"));
  mkdirSync(path.join(root, "subdir", "deep"), { recursive: true });
  writeFileSync(path.join(root, "studio.config.ts"), "");

  const result = resolveStudioRoot(path.join(root, "subdir", "deep"));

  expect(result).toBe(root);

  rmSync(root, { force: true, recursive: true });
});

it("returns the given arg resolved to an absolute path when provided", () => {
  const root = mkdtempSync(path.join(tmpdir(), "studio-root-"));
  // No studio.config.ts created — arg should win regardless

  const result = resolveStudioRoot("/some/cwd", root);

  expect(result).toBe(root);

  rmSync(root, { force: true, recursive: true });
});

it("returns the examples/ directory of an ancestor when it contains studio.config.ts", () => {
  const root = mkdtempSync(path.join(tmpdir(), "studio-root-"));
  const examplesDir = path.join(root, "examples");
  mkdirSync(examplesDir, { recursive: true });
  writeFileSync(path.join(examplesDir, "studio.config.ts"), "");

  const result = resolveStudioRoot(path.join(root, "packages", "dev-server"));

  expect(result).toBe(examplesDir);

  rmSync(root, { force: true, recursive: true });
});

it("returns cwd when no studio.config.ts is found in any parent or examples/", () => {
  const emptyDir = mkdtempSync(path.join(tmpdir(), "studio-empty-"));

  const result = resolveStudioRoot(emptyDir);

  expect(result).toBe(emptyDir);

  rmSync(emptyDir, { force: true, recursive: true });
});

it("returns cwd when called with filesystem root and no studio.config.ts exists", () => {
  const result = resolveStudioRoot("/");

  expect(result).toBe("/");
});

it("returns cwd when cwd itself contains studio.config.ts", () => {
  const root = mkdtempSync(path.join(tmpdir(), "studio-root-"));
  writeFileSync(path.join(root, "studio.config.ts"), "");

  const result = resolveStudioRoot(root);

  expect(result).toBe(root);

  rmSync(root, { force: true, recursive: true });
});
