import { describe, expect, mock, test } from "bun:test";

import { getSkillInstallCommand, maybeInstallSkill } from "../skill.js";

mock.module("node:child_process", () => ({
  spawnSync: mock(() => ({ error: null, status: 0, stdout: "" })),
}));

describe("getSkillInstallCommand", () => {
  test("returns npx command for npm", () => {
    const cmd = getSkillInstallCommand("npm");
    expect(cmd).toBe("npx skills add m7md1alaa/stdout-design");
  });

  test("returns bunx command for bun", () => {
    const cmd = getSkillInstallCommand("bun");
    expect(cmd).toBe("bunx skills add m7md1alaa/stdout-design");
  });

  test("returns pnpm dlx command for pnpm", () => {
    const cmd = getSkillInstallCommand("pnpm");
    expect(cmd).toBe("pnpm dlx skills add m7md1alaa/stdout-design");
  });

  test("returns yarn dlx command for yarn", () => {
    const cmd = getSkillInstallCommand("yarn");
    expect(cmd).toBe("yarn dlx skills add m7md1alaa/stdout-design");
  });

  test("falls back to npx for unknown package manager", () => {
    const cmd = getSkillInstallCommand("unknown" as never);
    expect(cmd).toBe("npx skills add m7md1alaa/stdout-design");
  });
});

describe("maybeInstallSkill", () => {
  test("returns false when shouldInstall is false", async () => {
    const result = await maybeInstallSkill({
      packageManager: "npm",
      shouldInstall: false,
    });
    expect(result).toBe(false);
  });

  test("returns false when quiet with no explicit preference", async () => {
    const result = await maybeInstallSkill({
      packageManager: "npm",
      quiet: true,
    });
    expect(result).toBe(false);
  });

  test("returns true when shouldInstall is true and install succeeds", async () => {
    const { spawnSync } = await import("node:child_process");
    (spawnSync as ReturnType<typeof mock>).mockImplementation(() => ({
      error: null,
      status: 0,
      stdout: "",
    }));

    const result = await maybeInstallSkill({
      packageManager: "npm",
      shouldInstall: true,
    });
    expect(result).toBe(true);
  });

  test("returns false when shouldInstall is true but install fails", async () => {
    const { spawnSync } = await import("node:child_process");
    (spawnSync as ReturnType<typeof mock>).mockImplementation(() => ({
      error: new Error("fail"),
      status: 1,
      stdout: "",
    }));

    const result = await maybeInstallSkill({
      packageManager: "npm",
      shouldInstall: true,
    });
    expect(result).toBe(false);
  });

  test("returns true early when skill is already installed", async () => {
    const { spawnSync } = await import("node:child_process");
    (spawnSync as ReturnType<typeof mock>).mockImplementation(() => ({
      error: null,
      status: 0,
      stdout: JSON.stringify([{ name: "studio" }]),
    }));

    const result = await maybeInstallSkill({
      packageManager: "npm",
      quiet: false,
      shouldInstall: undefined,
    });
    expect(result).toBe(true);
  });
});
