import { describe, expect, test } from "bun:test";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";

describe("detectPackageManager", () => {
  test("detects pnpm from pnpm-lock.yaml in cwd", async () => {
    const tmp = mkdtempSync(path.join(tmpdir(), "detect-pm-test-"));
    writeFileSync(path.join(tmp, "pnpm-lock.yaml"), "");

    const { detectPackageManager } = await import("../../init.js");
    expect(await detectPackageManager(tmp)).toBe("pnpm");

    rmSync(tmp, { force: true, recursive: true });
  });

  test("detects npm from package-lock.json in cwd", async () => {
    const tmp = mkdtempSync(path.join(tmpdir(), "detect-pm-test-"));
    writeFileSync(path.join(tmp, "package-lock.json"), "{}");

    const { detectPackageManager } = await import("../../init.js");
    expect(await detectPackageManager(tmp)).toBe("npm");

    rmSync(tmp, { force: true, recursive: true });
  });

  test("detects yarn from yarn.lock in cwd", async () => {
    const tmp = mkdtempSync(path.join(tmpdir(), "detect-pm-test-"));
    writeFileSync(path.join(tmp, "yarn.lock"), "");

    const { detectPackageManager } = await import("../../init.js");
    expect(await detectPackageManager(tmp)).toBe("yarn");

    rmSync(tmp, { force: true, recursive: true });
  });

  test("detects bun from bun.lock in cwd", async () => {
    const tmp = mkdtempSync(path.join(tmpdir(), "detect-pm-test-"));
    writeFileSync(path.join(tmp, "bun.lock"), "");

    const { detectPackageManager } = await import("../../init.js");
    expect(await detectPackageManager(tmp)).toBe("bun");

    rmSync(tmp, { force: true, recursive: true });
  });

  test("defaults to npm when no lock files in cwd", async () => {
    const tmp = mkdtempSync(path.join(tmpdir(), "detect-pm-test-"));

    const { detectPackageManager } = await import("../../init.js");
    expect(await detectPackageManager(tmp)).toBe("npm");

    rmSync(tmp, { force: true, recursive: true });
  });

  test("detects from cwd lockfile even when parent has different lockfile", async () => {
    const tmp = mkdtempSync(path.join(tmpdir(), "detect-pm-test-"));
    writeFileSync(path.join(tmp, "pnpm-lock.yaml"), "");

    const parent = mkdtempSync(path.join(tmpdir(), "detect-pm-parent-"));
    writeFileSync(path.join(parent, "package-lock.json"), "{}");

    const { detectPackageManager } = await import("../../init.js");
    expect(await detectPackageManager(tmp)).toBe("pnpm");
    expect(await detectPackageManager(parent)).toBe("npm");

    rmSync(tmp, { force: true, recursive: true });
    rmSync(parent, { force: true, recursive: true });
  });
});
