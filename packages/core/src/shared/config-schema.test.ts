import { describe, expect, it } from "bun:test";

import { parseStudioConfig } from "./config-schema.js";

const baseConfig = {
  presets: [{ height: 630, id: "og", platform: "web", width: 1200 }],
  templates: { hero: { componentPath: "./templates/hero.tsx" } },
};

const allowTrustedExampleCom = (url: string) =>
  url.startsWith("https://trusted.example.com/");

describe("parseStudioConfig", () => {
  it("parses a minimal valid config", () => {
    const result = parseStudioConfig(baseConfig);

    expect("config" in result).toBe(true);
  });

  it("returns issues for an invalid config", () => {
    const result = parseStudioConfig({ templates: {} });

    expect("issues" in result).toBe(true);
  });

  it("preserves a function-valued images.allowUrl instead of silently stripping it", () => {
    const allowUrl = allowTrustedExampleCom;

    const result = parseStudioConfig({
      ...baseConfig,
      images: { allowUrl },
    });

    expect("config" in result).toBe(true);
    if (!("config" in result)) {
      throw new Error("expected config, got issues");
    }
    expect(result.config.images?.allowUrl).toBe(allowUrl);
    expect(
      result.config.images?.allowUrl?.("https://trusted.example.com/a.png")
    ).toBe(true);
    expect(
      result.config.images?.allowUrl?.("https://evil.example.com/a.png")
    ).toBe(false);
  });

  it("preserves a function-valued images.fetch", () => {
    const customFetch = (() =>
      Promise.reject(
        new Error("unused")
      )) as unknown as typeof globalThis.fetch;

    const result = parseStudioConfig({
      ...baseConfig,
      images: { fetch: customFetch },
    });

    expect("config" in result).toBe(true);
    if (!("config" in result)) {
      throw new Error("expected config, got issues");
    }
    expect(result.config.images?.fetch).toBe(customFetch);
  });

  it("preserves images.maxBytes, timeout, and emoji", () => {
    const result = parseStudioConfig({
      ...baseConfig,
      images: { emoji: "twemoji", maxBytes: 1024, timeout: 2000 },
    });

    expect("config" in result).toBe(true);
    if (!("config" in result)) {
      throw new Error("expected config, got issues");
    }
    expect(result.config.images?.maxBytes).toBe(1024);
    expect(result.config.images?.timeout).toBe(2000);
    expect(result.config.images?.emoji).toBe("twemoji");
  });

  it("rejects a non-function value for images.allowUrl", () => {
    const result = parseStudioConfig({
      ...baseConfig,
      images: { allowUrl: "not-a-function" },
    });

    expect("issues" in result).toBe(true);
  });

  it("omits images entirely when not configured", () => {
    const result = parseStudioConfig(baseConfig);

    expect("config" in result).toBe(true);
    if (!("config" in result)) {
      throw new Error("expected config, got issues");
    }
    expect(result.config.images).toBeUndefined();
  });
});
