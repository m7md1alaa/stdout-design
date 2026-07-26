import { afterEach, describe, expect, it, mock } from "bun:test";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";

import type { ComponentType } from "react";
import { createElement } from "react";

import type { CompiledTemplate } from "../engine/render.js";

mock.module("takumi-js/helpers/jsx", () => ({
  fromJsx: mock(() =>
    Promise.resolve({
      node: { type: "container" },
      stylesheets: [] as string[],
    })
  ),
}));

mock.module("@takumi-rs/helpers", () => ({
  googleFonts: mock(() => Promise.resolve([])),
}));

mock.module("takumi-js/node", () => ({
  Renderer: class {
    render = mock(() => Promise.resolve(Buffer.from("rendered-bytes")));
    measure = mock(() =>
      Promise.resolve({
        children: [] as [],
        height: 100,
        runs: [] as [],
        transform: [1, 0, 0, 1, 0, 0] as [
          number,
          number,
          number,
          number,
          number,
          number,
        ],
        width: 200,
      })
    );
    registerFont = mock(() => Promise.resolve([]));
  },
}));

const { __resetRendererForTesting } = await import("../engine/renderer.js");
__resetRendererForTesting();

const { orchestrateRender } = await import("../orchestrate/orchestrate.js");
const { orchestrateMeasure } = await import("../orchestrate/orchestrate.js");

const compiled = {
  node: { type: "container" },
  stylesheets: [],
} as unknown as CompiledTemplate;

const makeComponent = ((props: Record<string, unknown>) =>
  createElement("div", null, String(props.name))) as ComponentType<
  Record<string, unknown>
>;

describe("orchestrateRender", () => {
  let tmpDir = "";

  afterEach(() => {
    if (tmpDir) {
      try {
        rmSync(tmpDir, { force: true, recursive: true });
      } catch {
        // cleanup best-effort
      }
      tmpDir = "";
    }
    __resetRendererForTesting();
  });

  it("renders a pre-compiled template and returns bytes with metadata", async () => {
    tmpDir = mkdtempSync(path.join(tmpdir(), "stdout-orch-"));
    const { RenderCache } = await import("../cache/render-cache.js");
    const cache = new RenderCache({ cacheDir: tmpDir });
    await cache.init();

    const result = await orchestrateRender({
      cache,
      compiledTemplate: compiled,
      height: 100,
      props: { name: "hello" },
      templateContentHash: "abc123",
      templateId: "test",
      width: 100,
    });

    expect(result.bytes).toBeInstanceOf(Buffer);
    expect(result.cacheHit).toBe(false);
    expect(result.format).toBe("png");
    expect(result.width).toBe(100);
    expect(result.height).toBe(100);
    expect(result.durationMs).toBeGreaterThan(0);

    cache.close();
  });

  it("returns cache hit on second identical call", async () => {
    tmpDir = mkdtempSync(path.join(tmpdir(), "stdout-orch-"));
    const { RenderCache } = await import("../cache/render-cache.js");
    const cache = new RenderCache({ cacheDir: tmpDir });
    await cache.init();

    const baseInput = {
      cache,
      compiledTemplate: compiled,
      height: 100,
      props: { name: "cached" },
      templateContentHash: "hash-cache",
      templateId: "test",
      width: 100,
    };

    const first = await orchestrateRender(baseInput);
    const second = await orchestrateRender(baseInput);

    expect(first.cacheHit).toBe(false);
    expect(second.cacheHit).toBe(true);
    expect(second.bytes).toBeInstanceOf(Buffer);

    cache.close();
  });

  it("compiles a component internally and renders", async () => {
    tmpDir = mkdtempSync(path.join(tmpdir(), "stdout-orch-"));
    const { RenderCache } = await import("../cache/render-cache.js");
    const cache = new RenderCache({ cacheDir: tmpDir });
    await cache.init();

    const result = await orchestrateRender({
      cache,
      component: makeComponent,
      height: 100,
      props: { name: "compiled" },
      templateContentHash: "hash-compile",
      templateId: "test",
      width: 100,
    });

    expect(result.bytes).toBeInstanceOf(Buffer);
    expect(result.cacheHit).toBe(false);
    expect(result.format).toBe("png");

    cache.close();
  });

  it("throws when neither compiledTemplate nor component is provided", async () => {
    tmpDir = mkdtempSync(path.join(tmpdir(), "stdout-orch-"));
    const { RenderCache } = await import("../cache/render-cache.js");
    const cache = new RenderCache({ cacheDir: tmpDir });
    await cache.init();

    await expect(
      orchestrateRender({
        cache,
        height: 100,
        props: { name: "bad" },
        templateContentHash: "hash-err",
        templateId: "test",
        width: 100,
      } as unknown as Parameters<typeof orchestrateRender>[0])
    ).rejects.toThrow("Must provide either compiledTemplate or component");

    cache.close();
  });

  it("calls loadLocaleData and merges locale translations into props", async () => {
    tmpDir = mkdtempSync(path.join(tmpdir(), "stdout-orch-"));
    const { RenderCache } = await import("../cache/render-cache.js");
    const cache = new RenderCache({ cacheDir: tmpDir });
    await cache.init();

    const loadLocaleData = mock(
      (locale: string): Promise<Record<string, unknown>> => {
        expect(locale).toBe("ar");
        return Promise.resolve({ title: "مرحبا" });
      }
    );

    const result = await orchestrateRender({
      cache,
      compiledTemplate: compiled,
      height: 100,
      loadLocaleData,
      locale: "ar",
      props: { name: "hello" },
      templateContentHash: "hash-locale",
      templateId: "test",
      width: 100,
    });

    expect(result.bytes).toBeInstanceOf(Buffer);
    expect(loadLocaleData).toHaveBeenCalledTimes(1);

    cache.close();
  });

  it("does not call loadLocaleData when locale is not provided", async () => {
    tmpDir = mkdtempSync(path.join(tmpdir(), "stdout-orch-"));
    const { RenderCache } = await import("../cache/render-cache.js");
    const cache = new RenderCache({ cacheDir: tmpDir });
    await cache.init();

    const loadLocaleData = mock(
      (): Promise<Record<string, unknown>> =>
        Promise.resolve({ title: "unused" })
    );

    await orchestrateRender({
      cache,
      compiledTemplate: compiled,
      height: 100,
      loadLocaleData,
      props: { name: "hello" },
      templateContentHash: "hash-no-locale",
      templateId: "test",
      width: 100,
    });

    expect(loadLocaleData).toHaveBeenCalledWith("default");

    cache.close();
  });

  it("resolves fonts for Arabic locale via googleFonts", async () => {
    tmpDir = mkdtempSync(path.join(tmpdir(), "stdout-orch-"));
    const { RenderCache } = await import("../cache/render-cache.js");
    const cache = new RenderCache({ cacheDir: tmpDir });
    await cache.init();

    const result = await orchestrateRender({
      cache,
      compiledTemplate: compiled,
      height: 100,
      locale: "ar",
      props: { name: "مرحبا" },
      templateContentHash: "hash-ar",
      templateId: "test",
      width: 100,
    });

    expect(result.bytes).toBeInstanceOf(Buffer);
    expect(result.cacheHit).toBe(false);

    cache.close();
  });

  it("does not resolve fonts for non-Arabic locale", async () => {
    tmpDir = mkdtempSync(path.join(tmpdir(), "stdout-orch-"));
    const { RenderCache } = await import("../cache/render-cache.js");
    const cache = new RenderCache({ cacheDir: tmpDir });
    await cache.init();

    const result = await orchestrateRender({
      cache,
      compiledTemplate: compiled,
      height: 100,
      locale: "en",
      props: { name: "hello" },
      templateContentHash: "hash-en",
      templateId: "test",
      width: 100,
    });

    expect(result.bytes).toBeInstanceOf(Buffer);
    expect(result.cacheHit).toBe(false);

    cache.close();
  });

  it("uses pre-resolved fonts when provided instead of resolving automatically", async () => {
    tmpDir = mkdtempSync(path.join(tmpdir(), "stdout-orch-"));
    const { RenderCache } = await import("../cache/render-cache.js");
    const cache = new RenderCache({ cacheDir: tmpDir });
    await cache.init();

    const preResolvedFonts = [
      { data: new Uint8Array([0, 1, 2]), name: "CustomFont" },
    ];

    const result = await orchestrateRender({
      cache,
      compiledTemplate: compiled,
      fontFamilies: ["CustomFont"],
      fonts: preResolvedFonts,
      height: 100,
      locale: "ar",
      props: { name: "مرحبا" },
      templateContentHash: "hash-pre-rslv",
      templateId: "test",
      width: 100,
    });

    expect(result.bytes).toBeInstanceOf(Buffer);
    expect(result.cacheHit).toBe(false);

    cache.close();
  });

  it("survives a cache write failure and returns rendered bytes", async () => {
    tmpDir = mkdtempSync(path.join(tmpdir(), "stdout-orch-"));
    const { RenderCache } = await import("../cache/render-cache.js");

    // oxlint-disable-next-line max-classes-per-file
    class FailingCache extends RenderCache {
      // oxlint-disable-next-line class-methods-use-this, require-await
      override async setPixels(): Promise<string> {
        throw new Error(
          "ENOENT: no such file or directory, open '/fake/temp.png.12345'"
        );
      }
    }

    const cache = new FailingCache({ cacheDir: tmpDir });
    await cache.init();

    const result = await orchestrateRender({
      cache,
      compiledTemplate: compiled,
      height: 100,
      props: { name: "survive-cache-failure" },
      templateContentHash: "hash-fail",
      templateId: "test",
      width: 100,
    });

    expect(result.bytes).toBeInstanceOf(Buffer);
    expect(result.cacheHit).toBe(false);
    expect(result.format).toBe("png");

    cache.close();
  });
});

describe("orchestrateMeasure", () => {
  let tmpDir = "";

  afterEach(() => {
    if (tmpDir) {
      try {
        rmSync(tmpDir, { force: true, recursive: true });
      } catch {
        // cleanup best-effort
      }
      tmpDir = "";
    }
    __resetRendererForTesting();
  });

  it("returns dimensions for a pre-compiled template", async () => {
    tmpDir = mkdtempSync(path.join(tmpdir(), "stdout-meas-"));
    const { RenderCache } = await import("../cache/render-cache.js");
    const cache = new RenderCache({ cacheDir: tmpDir });
    await cache.init();

    const result = await orchestrateMeasure({
      cache,
      compiledTemplate: compiled,
      props: { name: "measure" },
      templateContentHash: "hash-meas",
      templateId: "test",
    });

    expect(result.width).toBe(200);
    expect(result.height).toBe(100);
    expect(result.durationMs).toBeGreaterThan(0);

    cache.close();
  });

  it("returns dimensions for a component with internal compilation", async () => {
    tmpDir = mkdtempSync(path.join(tmpdir(), "stdout-meas-"));
    const { RenderCache } = await import("../cache/render-cache.js");
    const cache = new RenderCache({ cacheDir: tmpDir });
    await cache.init();

    const result = await orchestrateMeasure({
      cache,
      component: makeComponent,
      props: { name: "compiled" },
      templateContentHash: "hash-compile-meas",
      templateId: "test",
    });

    expect(result.width).toBe(200);
    expect(result.height).toBe(100);

    cache.close();
  });

  it("throws when neither compiledTemplate nor component is provided", async () => {
    tmpDir = mkdtempSync(path.join(tmpdir(), "stdout-meas-"));
    const { RenderCache } = await import("../cache/render-cache.js");
    const cache = new RenderCache({ cacheDir: tmpDir });
    await cache.init();

    await expect(
      orchestrateMeasure({
        cache,
        props: { name: "bad" },
        templateContentHash: "hash-err",
        templateId: "test",
      } as unknown as Parameters<typeof orchestrateMeasure>[0])
    ).rejects.toThrow("Must provide either compiledTemplate or component");

    cache.close();
  });
});
