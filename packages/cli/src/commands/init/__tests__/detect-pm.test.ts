import { describe, expect, test } from "bun:test";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";

describe("detectPackageManager", () => {
  test("detects bun from npm_config_user_agent", async () => {
    const oldAgent = process.env.npm_config_user_agent;
    process.env.npm_config_user_agent = "bun/1.0.0";

    const { detectPackageManager } = await import("../../init.js");
    expect(await detectPackageManager()).toBe("bun");

    process.env.npm_config_user_agent = oldAgent;
  });

  test("detects pnpm from npm_config_user_agent", async () => {
    const oldAgent = process.env.npm_config_user_agent;
    process.env.npm_config_user_agent = "pnpm/8.0.0";

    const { detectPackageManager } = await import("../../init.js");
    expect(await detectPackageManager()).toBe("pnpm");

    process.env.npm_config_user_agent = oldAgent;
  });

  test("detects yarn from npm_config_user_agent", async () => {
    const oldAgent = process.env.npm_config_user_agent;
    process.env.npm_config_user_agent = "yarn/1.22.0";

    const { detectPackageManager } = await import("../../init.js");
    expect(await detectPackageManager()).toBe("yarn");

    process.env.npm_config_user_agent = oldAgent;
  });

  test("falls back to filesystem detection when no user agent", async () => {
    const oldAgent = process.env.npm_config_user_agent;
    process.env.npm_config_user_agent = "";

    const { detectPackageManager } = await import("../../init.js");
    const pm = await detectPackageManager();
    expect(["bun", "npm", "pnpm", "yarn"]).toContain(pm);

    process.env.npm_config_user_agent = oldAgent;
  });

  test("defaults to npm when no agent and no lock files anywhere", async () => {
    const oldAgent = process.env.npm_config_user_agent;
    process.env.npm_config_user_agent = "";

    const oldCwd = process.cwd;
    const tmp = mkdtempSync(path.join(tmpdir(), "detect-pm-test-"));
    process.cwd = () => tmp;

    try {
      const { detectPackageManager } = await import("../../init.js");
      expect(await detectPackageManager()).toBe("npm");
    } finally {
      process.cwd = oldCwd;
      rmSync(tmp, { force: true, recursive: true });
      process.env.npm_config_user_agent = oldAgent;
    }
  });
});
