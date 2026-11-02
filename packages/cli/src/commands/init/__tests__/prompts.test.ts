import { describe, expect, test } from "bun:test";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";

import { STARTER_IDS } from "../catalog.js";
import type { ClackModule } from "../prompts.js";
import { collectPrompts } from "../prompts.js";

const inTempDir = (): string => {
  const dir = mkdtempSync(path.join(tmpdir(), "studio-prompt-test-"));
  return dir;
};

// collectPrompts skips its questions in CI, so each test sets the CI
// variables it needs and restores them, whatever the runner sets.
const CI_VARS = ["CI", "CIRCLECI", "GITHUB_ACTIONS", "GITLAB_CI"] as const;

const withCiEnv = async <T>(
  value: string | undefined,
  run: () => Promise<T>
): Promise<T> => {
  const saved = CI_VARS.map((name) => [name, process.env[name]] as const);
  for (const name of CI_VARS) {
    Reflect.deleteProperty(process.env, name);
  }
  if (value !== undefined) {
    process.env.CI = value;
  }
  try {
    return await run();
  } finally {
    for (const [name, old] of saved) {
      if (old === undefined) {
        Reflect.deleteProperty(process.env, name);
      } else {
        process.env[name] = old;
      }
    }
  }
};

describe("collectPrompts", () => {
  test("returns defaults in --yes mode with projectDir", async () => {
    const dir = inTempDir();
    const fakeClack = {} as never;

    const result = await collectPrompts(fakeClack, dir, { yes: true });

    expect(result.resolvedDir).toBe(dir);
    expect(result.projectName).toBe(path.basename(dir));
    expect(result.templates).toEqual(STARTER_IDS);
    expect(result.locales).toEqual(["en", "ar"]);
    expect(result.wantsGit).toBe(true);
    expect(result.shouldInstall).toBe(true);

    rmSync(dir, { force: true, recursive: true });
  });

  test("returns defaults in CI mode without projectDir", async () => {
    const fakeClack = {} as never;

    const result = await withCiEnv("true", () => collectPrompts(fakeClack));

    expect(result.projectName).toBe("studio-project");
    expect(result.templates).toEqual(STARTER_IDS);
    expect(result.locales).toEqual(["en", "ar"]);
    expect(result.shouldInstall).toBe(true);
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

    const result = await withCiEnv(undefined, () => collectPrompts(fakeClack));

    expect(result.projectName).toBe("my-app");
    expect(result.templates).toEqual(["bento-feature"]);
    expect(result.locales).toEqual(["en"]);
    expect(result.shouldInstall).toBe(true);
    expect(called.length).toBeGreaterThanOrEqual(4);
  });
});
