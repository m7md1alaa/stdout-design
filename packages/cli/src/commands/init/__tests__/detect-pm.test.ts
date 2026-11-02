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

  test("falls back to the launching package manager, then npm, with no lock files", async () => {
    const tmp = mkdtempSync(path.join(tmpdir(), "detect-pm-test-"));
    const userAgent = process.env.npm_config_user_agent;

    const { detectPackageManager } = await import("../../init.js");
    try {
      process.env.npm_config_user_agent = "pnpm/10.0.0 node/v22.0.0";
      expect(await detectPackageManager(tmp)).toBe("pnpm");
      delete process.env.npm_config_user_agent;
      expect(await detectPackageManager(tmp)).toBe("npm");
    } finally {
      if (userAgent === undefined) {
        delete process.env.npm_config_user_agent;
      } else {
        process.env.npm_config_user_agent = userAgent;
      }
      rmSync(tmp, { force: true, recursive: true });
    }
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
