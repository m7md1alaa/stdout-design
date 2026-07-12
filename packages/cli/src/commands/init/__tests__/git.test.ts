import { afterAll, afterEach, describe, expect, mock, test } from "bun:test";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";

import { isInsideGitRepo } from "../git.js";

afterAll(() => {
  mock.restore();
});

const inTempDir = (): string => {
  const dir = mkdtempSync(path.join(tmpdir(), "studio-git-test-"));
  return dir;
};

describe("isInsideGitRepo", () => {
  test("returns false when no .git exists in any parent", () => {
    const dir = inTempDir();
    expect(isInsideGitRepo(dir)).toBe(false);
    rmSync(dir, { force: true, recursive: true });
  });

  test("returns true when .git exists in the directory", () => {
    const dir = inTempDir();
    writeFileSync(path.join(dir, ".git"), "");
    expect(isInsideGitRepo(dir)).toBe(true);
    rmSync(dir, { force: true, recursive: true });
  });

  test("returns true when .git exists in a parent directory", () => {
    const dir = inTempDir();
    const childDir = path.join(dir, "sub", "nested");
    mkdirSync(childDir, { recursive: true });
    writeFileSync(path.join(dir, ".git"), "");

    expect(isInsideGitRepo(childDir)).toBe(true);

    rmSync(dir, { force: true, recursive: true });
  });
});

describe("tryGitInit", () => {
  afterEach(() => {
    mock.restore();
  });
  test("returns false when git is not installed", async () => {
    mock.module("node:child_process", () => ({
      execSync: () => {
        throw new Error("git not found");
      },
    }));

    const { tryGitInit: tryInit } = await import("../git.js");
    const dir = inTempDir();
    expect(tryInit(dir)).toBe(false);
    rmSync(dir, { force: true, recursive: true });
  });

  test("returns false when git init fails", async () => {
    let callCount = 0;
    mock.module("node:child_process", () => ({
      execSync: () => {
        callCount += 1;
        if (callCount > 1) {
          throw new Error("git init failed");
        }
        return Buffer.from("");
      },
    }));
    mock.module("node:fs", () => ({
      existsSync: () => false,
    }));

    const { tryGitInit: tryInit } = await import("../git.js");
    const dir = inTempDir();
    expect(tryInit(dir)).toBe(false);
    rmSync(dir, { force: true, recursive: true });
  });
});
