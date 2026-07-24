import { describe, expect, mock, test } from "bun:test";

describe("getLatestVersion", () => {
  test("returns version string when npm registry responds with 200", async () => {
    const fakeResponse = {
      json: () => Promise.resolve({ version: "0.2.9" }),
      status: 200,
    };
    globalThis.fetch = mock(() => Promise.resolve(fakeResponse));

    const { getLatestVersion } = await import("../registry.js");
    const result = await getLatestVersion();
    expect(result).toBe("0.2.9");
  });

  test("returns null when fetch throws a network error", async () => {
    globalThis.fetch = mock(() => Promise.reject(new Error("network error")));

    const { getLatestVersion } = await import("../registry.js");
    const result = await getLatestVersion();
    expect(result).toBeNull();
  });

  test("returns null when registry responds with non-200 status", async () => {
    const fakeResponse = {
      json: () => Promise.resolve({ version: "0.2.9" }),
      status: 500,
    };
    globalThis.fetch = mock(() => Promise.resolve(fakeResponse));

    const { getLatestVersion } = await import("../registry.js");
    const result = await getLatestVersion();
    expect(result).toBeNull();
  });
});
