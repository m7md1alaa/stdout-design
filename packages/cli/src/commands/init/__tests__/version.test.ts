import { describe, expect, mock, test } from "bun:test";

describe("getScaffoldVersion", () => {
  test("returns 'latest' when package.json cannot be resolved", async () => {
    mock.module("node:module", () => ({
      createRequire: () => () => {
        throw new Error("Module not found");
      },
    }));

    const { getScaffoldVersion } = await import("../version.js");
    expect(getScaffoldVersion()).toBe("latest");
  });
});
