import { describe, expect, test } from "bun:test";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";

import type { ClackModule } from "../prompts.js";
import { collectPrompts } from "../prompts.js";

const inTempDir = (): string => {
  const dir = mkdtempSync(path.join(tmpdir(), "studio-prompt-test-"));
  return dir;
};

describe("collectPrompts", () => {
  test("returns defaults in --yes mode with projectDir", async () => {
    const dir = inTempDir();
    const fakeClack = {} as never;

    const result = await collectPrompts(fakeClack, dir, { yes: true });

    expect(result.resolvedDir).toBe(dir);
    expect(result.projectName).toBe(path.basename(dir));
    expect(result.templates).toEqual(["bento-feature"]);
    expect(result.locales).toEqual(["en", "ar"]);
    expect(result.wantsGit).toBe(true);
    expect(result.shouldInstall).toBe(true);

    rmSync(dir, { force: true, recursive: true });
  });

  test("returns defaults in CI mode without projectDir", async () => {
    const oldCI = process.env.CI;
    process.env.CI = "true";
    const fakeClack = {} as never;

    const result = await collectPrompts(fakeClack);

    expect(result.projectName).toBe("studio-project");
    expect(result.templates).toEqual(["bento-feature"]);
    expect(result.locales).toEqual(["en", "ar"]);
    expect(result.shouldInstall).toBe(true);

    process.env.CI = oldCI;
  });

  test("interactive mode calls clack prompts and returns their values", async () => {
    const called: string[] = [];

    const fakeClack: ClackModule = {
      cancel: () => {},
      confirm: (opts) => {
        called.push(`confirm:${opts.message}`);
        return Promise.resolve(true);
      },
      isCancel: () => false,
      multiselect: (opts) => {
        called.push(`multiselect:${opts.message}`);
        if (opts.message.includes("templates")) {
          return Promise.resolve(["bento-feature"]);
        }
        if (opts.message.includes("locales")) {
          return Promise.resolve(["en"]);
        }
        return Promise.resolve([]);
      },
      text: (opts) => {
        called.push(`text:${opts.message as string}`);
        return Promise.resolve("my-app");
      },
    };

    const result = await collectPrompts(fakeClack);

    expect(result.projectName).toBe("my-app");
    expect(result.templates).toEqual(["bento-feature"]);
    expect(result.locales).toEqual(["en"]);
    expect(result.shouldInstall).toBe(true);
    expect(called.length).toBeGreaterThanOrEqual(4);
  });
});
