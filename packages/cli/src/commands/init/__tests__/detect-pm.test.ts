import { afterAll, describe, expect, mock, test } from "bun:test";

afterAll(() => {
  mock.restore();
});

describe("detectPackageManager", () => {
  test("detects bun from npm_config_user_agent", async () => {
    mock.module("node:fs", () => ({
      existsSync: () => false,
    }));
    const oldAgent = process.env.npm_config_user_agent;
    process.env.npm_config_user_agent = "bun/1.0.0";

    const { detectPackageManager } = await import("../../init.js");
    expect(detectPackageManager()).toBe("bun");

    process.env.npm_config_user_agent = oldAgent;
  });

  test("detects pnpm from npm_config_user_agent", async () => {
    mock.module("node:fs", () => ({
      existsSync: () => false,
    }));
    const oldAgent = process.env.npm_config_user_agent;
    process.env.npm_config_user_agent = "pnpm/8.0.0";

    const { detectPackageManager } = await import("../../init.js");
    expect(detectPackageManager()).toBe("pnpm");

    process.env.npm_config_user_agent = oldAgent;
  });

  test("detects yarn from npm_config_user_agent", async () => {
    mock.module("node:fs", () => ({
      existsSync: () => false,
    }));
    const oldAgent = process.env.npm_config_user_agent;
    process.env.npm_config_user_agent = "yarn/1.22.0";

    const { detectPackageManager } = await import("../../init.js");
    expect(detectPackageManager()).toBe("yarn");

    process.env.npm_config_user_agent = oldAgent;
  });

  test("falls back to npm when no user agent or lock files", async () => {
    mock.module("node:fs", () => ({
      existsSync: () => false,
    }));
    const oldAgent = process.env.npm_config_user_agent;
    process.env.npm_config_user_agent = "";

    const { detectPackageManager } = await import("../../init.js");
    expect(detectPackageManager()).toBe("npm");

    process.env.npm_config_user_agent = oldAgent;
  });
});
