import { afterEach, describe, expect, it } from "bun:test";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";

import { createElement } from "react";
import type { ComponentType } from "react";

const PNG_HEADER = [137, 80, 78, 71] as const;

describe("full-pipeline (real Takumi)", () => {
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
  });

  describe("compileTemplate via real fromJsx", () => {
    it("compiles a React element into a Takumi node structure", async () => {
      const { compileTemplate } = await import("../engine/render.js");

      const element = createElement(
        "div",
        { style: { backgroundColor: "red", height: 100, width: 100 } },
        "Hello"
      );

      const result = await compileTemplate(element);

      expect(result.node).toBeDefined();
      expect(typeof result.node).toBe("object");
      expect(result.stylesheets).toBeInstanceOf(Array);
    });

    it("accepts fromJsx options and returns node + stylesheets", async () => {
      const { compileTemplate } = await import("../engine/render.js");

      const element = createElement("span", null, "Text");
      const result = await compileTemplate(element, { defaultStyles: false });

      expect(result.node).toBeDefined();
      expect(result.stylesheets).toBeInstanceOf(Array);
    });
  });

  describe("renderToPixels via real Renderer", () => {
    afterEach(async () => {
      const { __resetRendererForTesting } =
        await import("../engine/renderer.js");
      __resetRendererForTesting();
    });

    it("produces valid PNG bytes for a compiled template", async () => {
      const { compileTemplate } = await import("../engine/render.js");
      const { renderToPixels, __resetRendererForTesting } =
        await import("../engine/renderer.js");
      __resetRendererForTesting();

      const element = createElement("div", null, "Test");
      const compiled = await compileTemplate(element);

      const output = await renderToPixels(compiled, {
        height: 100,
        width: 100,
      });

      expect(output.bytes).toBeInstanceOf(Buffer);
      expect(output.bytes.length).toBeGreaterThan(0);
      expect(output.format).toBe("png");
      expect(output.width).toBe(100);
      expect(output.height).toBe(100);

      expect(output.bytes[0]).toBe(PNG_HEADER[0]);
      expect(output.bytes[1]).toBe(PNG_HEADER[1]);
      expect(output.bytes[2]).toBe(PNG_HEADER[2]);
      expect(output.bytes[3]).toBe(PNG_HEADER[3]);
    });

    it("produces jpeg output when format is specified", async () => {
      const { compileTemplate } = await import("../engine/render.js");
      const { renderToPixels, __resetRendererForTesting } =
        await import("../engine/renderer.js");
      __resetRendererForTesting();

      const element = createElement("div", null, "JPEG");
      const compiled = await compileTemplate(element);

      const output = await renderToPixels(
        compiled,
        { height: 50, width: 50 },
        { format: "jpeg", quality: 80 }
      );

      expect(output.bytes).toBeInstanceOf(Buffer);
      expect(output.bytes.length).toBeGreaterThan(0);
      expect(output.format).toBe("jpeg");
      // JPEG magic bytes: 0xFF 0xD8
      expect(output.bytes[0]).toBe(255);
      expect(output.bytes[1]).toBe(216);
    });

    it("produces webp output when format is webp", async () => {
      const { compileTemplate } = await import("../engine/render.js");
      const { renderToPixels, __resetRendererForTesting } =
        await import("../engine/renderer.js");
      __resetRendererForTesting();

      const element = createElement("div", null, "WebP");
      const compiled = await compileTemplate(element);

      const output = await renderToPixels(
        compiled,
        { height: 50, width: 50 },
        { format: "webp" }
      );

      expect(output.bytes).toBeInstanceOf(Buffer);
      expect(output.bytes.length).toBeGreaterThan(0);
      expect(output.format).toBe("webp");
    });
  });

  describe("measureTemplate via real Renderer", () => {
    afterEach(async () => {
      const { __resetRendererForTesting } =
        await import("../engine/renderer.js");
      __resetRendererForTesting();
    });

    it("returns non-zero dimensions for a compiled template", async () => {
      const { compileTemplate } = await import("../engine/render.js");
      const { measureTemplate, __resetRendererForTesting } =
        await import("../engine/renderer.js");
      __resetRendererForTesting();

      const element = createElement("div", null, "Measure test");
      const compiled = await compileTemplate(element);

      const measured = await measureTemplate(compiled);

      expect(measured.width).toBeGreaterThan(0);
      expect(measured.height).toBeGreaterThan(0);
    });
  });

  describe("orchestrateRender with real Renderer", () => {
    afterEach(async () => {
      const { __resetRendererForTesting } =
        await import("../engine/renderer.js");
      __resetRendererForTesting();
    });

    it("renders a component through the full orchestration pipeline (no mocking)", async () => {
      tmpDir = mkdtempSync(path.join(tmpdir(), "stdout-fullpipe-"));
      const { orchestrateRender } =
        await import("../orchestrate/orchestrate.js");
      const { RenderCache } = await import("../cache/render-cache.js");
      const cache = new RenderCache({ cacheDir: tmpDir });
      await cache.init();

      const makeComponent = ((props: Record<string, unknown>) =>
        createElement(
          "div",
          null,
          String(props.label ?? "full pipeline")
        )) as ComponentType<Record<string, unknown>>;

      const result = await orchestrateRender({
        cache,
        component: makeComponent,
        height: 100,
        props: { label: "full pipeline" },
        templateContentHash: "fp-test-hash",
        templateId: "full-pipeline-test",
        width: 100,
      });

      expect(result.bytes).toBeInstanceOf(Buffer);
      expect(result.bytes.length).toBeGreaterThan(0);
      expect(result.cacheHit).toBe(false);
      expect(result.format).toBe("png");
      expect(result.width).toBe(100);
      expect(result.height).toBe(100);
      expect(result.bytes[0]).toBe(PNG_HEADER[0]);

      cache.close();
    });

    it("caches render output on second call (real cache hit)", async () => {
      tmpDir = mkdtempSync(path.join(tmpdir(), "stdout-fullpipe-cache-"));
      const { orchestrateRender } =
        await import("../orchestrate/orchestrate.js");
      const { RenderCache } = await import("../cache/render-cache.js");
      const cache = new RenderCache({ cacheDir: tmpDir });
      await cache.init();

      const makeComponent = ((props: Record<string, unknown>) =>
        createElement(
          "div",
          null,
          String(props.label ?? "test")
        )) as ComponentType<Record<string, unknown>>;

      const first = await orchestrateRender({
        cache,
        component: makeComponent,
        height: 100,
        props: { label: "cached" },
        templateContentHash: "fp-cache-hash",
        templateId: "cache-test",
        width: 100,
      });

      const second = await orchestrateRender({
        cache,
        component: makeComponent,
        height: 100,
        props: { label: "cached" },
        templateContentHash: "fp-cache-hash",
        templateId: "cache-test",
        width: 100,
      });

      expect(first.cacheHit).toBe(false);
      expect(first.bytes[0]).toBe(PNG_HEADER[0]);
      expect(second.cacheHit).toBe(true);
      expect(second.bytes).toStrictEqual(first.bytes);

      cache.close();
    });

    it("renders differently with different props (produces different bytes)", async () => {
      tmpDir = mkdtempSync(path.join(tmpdir(), "stdout-fullpipe-diff-"));
      const { orchestrateRender } =
        await import("../orchestrate/orchestrate.js");
      const { RenderCache } = await import("../cache/render-cache.js");
      const cache = new RenderCache({ cacheDir: tmpDir });
      await cache.init();

      const makeComponent = ((props: Record<string, unknown>) =>
        createElement(
          "div",
          null,
          String(props.label ?? "test")
        )) as ComponentType<Record<string, unknown>>;

      const resultA = await orchestrateRender({
        cache,
        component: makeComponent,
        height: 100,
        props: { label: "AAA" },
        templateContentHash: "fp-diff-hash",
        templateId: "diff-test",
        width: 100,
      });

      const resultB = await orchestrateRender({
        cache,
        component: makeComponent,
        height: 100,
        props: { label: "BBB" },
        templateContentHash: "fp-diff-hash",
        templateId: "diff-test",
        width: 100,
      });

      expect(resultA.cacheHit).toBe(false);
      expect(resultB.cacheHit).toBe(false);
      expect(resultA.bytes).not.toStrictEqual(resultB.bytes);

      cache.close();
    });
  });

  describe("font resolution via createFetchFontsFromConfig with real googleFonts", () => {
    afterEach(async () => {
      const { __resetRendererForTesting } =
        await import("../engine/renderer.js");
      __resetRendererForTesting();
      const { clearFontCache } = await import("../assets/assets-resolver.js");
      clearFontCache();
    });

    it("resolves fonts from config for Arabic locale and renders valid PNG", async () => {
      tmpDir = mkdtempSync(path.join(tmpdir(), "stdout-fullpipe-fonts-"));
      const { orchestrateRender } =
        await import("../orchestrate/orchestrate.js");
      const { RenderCache } = await import("../cache/render-cache.js");
      const { createFetchFontsFromConfig } =
        await import("../assets/font-config.js");
      const cache = new RenderCache({ cacheDir: tmpDir });
      await cache.init();

      const fetchFonts = createFetchFontsFromConfig({
        ar: [
          {
            family: "IBM Plex Sans Arabic",
            weights: [400, 700],
          },
        ],
      });

      const makeComponent = ((props: Record<string, unknown>) =>
        createElement(
          "div",
          {
            style: {
              fontFamily: "IBM Plex Sans Arabic",
              fontSize: 24,
              padding: 16,
            },
          },
          String(props.label ?? "مرحبا بالعالم")
        )) as ComponentType<Record<string, unknown>>;

      const result = await orchestrateRender({
        cache,
        component: makeComponent,
        fetchFonts,
        height: 200,
        locale: "ar",
        props: { label: "النص العربي" },
        templateContentHash: "fp-integration-fonts-hash",
        templateId: "font-resolution-integration",
        width: 400,
      });

      expect(result.bytes).toBeInstanceOf(Buffer);
      expect(result.bytes.length).toBeGreaterThan(0);
      expect(result.cacheHit).toBe(false);
      expect(result.format).toBe("png");
      expect(result.bytes[0]).toBe(PNG_HEADER[0]);

      cache.close();
    });

    it("caches font render on second call (real cache hit with fonts)", async () => {
      tmpDir = mkdtempSync(path.join(tmpdir(), "stdout-fontcache-"));
      const { orchestrateRender } =
        await import("../orchestrate/orchestrate.js");
      const { RenderCache } = await import("../cache/render-cache.js");
      const { createFetchFontsFromConfig } =
        await import("../assets/font-config.js");
      const cache = new RenderCache({ cacheDir: tmpDir });
      await cache.init();

      const fetchFonts = createFetchFontsFromConfig({
        ar: [{ family: "Noto Sans Arabic", weights: [400] }],
      });

      const makeComponent = ((props: Record<string, unknown>) =>
        createElement(
          "div",
          {
            style: {
              fontFamily: "Noto Sans Arabic",
              fontSize: 20,
              padding: 12,
            },
          },
          String(props.label ?? "اختبار")
        )) as ComponentType<Record<string, unknown>>;

      const first = await orchestrateRender({
        cache,
        component: makeComponent,
        fetchFonts,
        height: 150,
        locale: "ar",
        props: { label: "اختبار" },
        templateContentHash: "fp-font-cache-hash",
        templateId: "font-cache-test",
        width: 300,
      });

      const second = await orchestrateRender({
        cache,
        component: makeComponent,
        fetchFonts,
        height: 150,
        locale: "ar",
        props: { label: "اختبار" },
        templateContentHash: "fp-font-cache-hash",
        templateId: "font-cache-test",
        width: 300,
      });

      expect(first.cacheHit).toBe(false);
      expect(first.bytes[0]).toBe(PNG_HEADER[0]);
      expect(second.cacheHit).toBe(true);
      expect(second.bytes).toStrictEqual(first.bytes);

      cache.close();
    });

    it("produces different bytes with custom fonts vs default for Arabic locale", async () => {
      tmpDir = mkdtempSync(path.join(tmpdir(), "stdout-fontdiff-"));
      const { orchestrateRender } =
        await import("../orchestrate/orchestrate.js");
      const { RenderCache } = await import("../cache/render-cache.js");
      const { createFetchFontsFromConfig } =
        await import("../assets/font-config.js");
      const cache = new RenderCache({ cacheDir: tmpDir });
      await cache.init();

      const customFetchFonts = createFetchFontsFromConfig({
        ar: [{ family: "IBM Plex Sans Arabic", weights: [400] }],
      });

      const makeComponent = ((props: Record<string, unknown>) =>
        createElement(
          "div",
          {
            style: {
              fontFamily: props.fontFamily as string,
              fontSize: 24,
              padding: 16,
            },
          },
          String(props.label ?? "مقارنة")
        )) as ComponentType<Record<string, unknown>>;

      const withCustomFont = await orchestrateRender({
        cache,
        component: makeComponent,
        fetchFonts: customFetchFonts,
        height: 200,
        locale: "ar",
        props: { fontFamily: "IBM Plex Sans Arabic", label: "النص العربي" },
        templateContentHash: "fp-fontdiff-hash",
        templateId: "font-diff-test",
        width: 400,
      });

      const { clearFontCache } = await import("../assets/assets-resolver.js");
      clearFontCache();

      const withDefault = await orchestrateRender({
        cache,
        component: makeComponent,
        fetchFonts: undefined,
        height: 200,
        locale: "ar",
        props: { fontFamily: "Noto Sans Arabic", label: "النص العربي" },
        templateContentHash: "fp-fontdiff-hash",
        templateId: "font-diff-test",
        width: 400,
      });

      expect(withCustomFont.cacheHit).toBe(false);
      expect(withDefault.cacheHit).toBe(false);
      expect(withCustomFont.bytes).toBeInstanceOf(Buffer);
      expect(withDefault.bytes).toBeInstanceOf(Buffer);
      expect(withCustomFont.bytes[0]).toBe(PNG_HEADER[0]);
      expect(withDefault.bytes[0]).toBe(PNG_HEADER[0]);
      expect(withCustomFont.bytes).not.toStrictEqual(withDefault.bytes);

      cache.close();
    });
  });

  describe("font resolution — Latin locale", () => {
    afterEach(async () => {
      const { __resetRendererForTesting } =
        await import("../engine/renderer.js");
      __resetRendererForTesting();
      const { clearFontCache } = await import("../assets/assets-resolver.js");
      clearFontCache();
    });

    it("renders with Inter (Latin font) and produces valid PNG", async () => {
      tmpDir = mkdtempSync(path.join(tmpdir(), "stdout-inter-"));
      const { orchestrateRender } =
        await import("../orchestrate/orchestrate.js");
      const { RenderCache } = await import("../cache/render-cache.js");
      const { createFetchFontsFromConfig } =
        await import("../assets/font-config.js");
      const cache = new RenderCache({ cacheDir: tmpDir });
      await cache.init();

      const fetchFonts = createFetchFontsFromConfig({
        ar: [{ family: "Inter", weights: [400] }],
      });

      const makeComponent = ((props: Record<string, unknown>) =>
        createElement(
          "div",
          {
            style: {
              fontFamily: "Inter",
              fontSize: 24,
              padding: 16,
            },
          },
          String(props.label ?? "Hello World")
        )) as ComponentType<Record<string, unknown>>;

      const result = await orchestrateRender({
        cache,
        component: makeComponent,
        fetchFonts,
        height: 100,
        locale: "ar",
        props: { label: "Hello World" },
        templateContentHash: "fp-latin-hash",
        templateId: "font-latin-inter",
        width: 300,
      });

      expect(result.bytes).toBeInstanceOf(Buffer);
      expect(result.bytes.length).toBeGreaterThan(0);
      expect(result.cacheHit).toBe(false);
      expect(result.format).toBe("png");
      expect(result.bytes[0]).toBe(PNG_HEADER[0]);

      cache.close();
    });

    it("renders with Noto Sans Hebrew (RTL) and produces valid PNG", async () => {
      tmpDir = mkdtempSync(path.join(tmpdir(), "stdout-hebrew-"));
      const { orchestrateRender } =
        await import("../orchestrate/orchestrate.js");
      const { RenderCache } = await import("../cache/render-cache.js");
      const { createFetchFontsFromConfig } =
        await import("../assets/font-config.js");
      const cache = new RenderCache({ cacheDir: tmpDir });
      await cache.init();

      const fetchFonts = createFetchFontsFromConfig({
        ar: [{ family: "Noto Sans Hebrew", weights: [400] }],
      });

      const makeComponent = ((props: Record<string, unknown>) =>
        createElement(
          "div",
          {
            style: {
              fontFamily: "Noto Sans Hebrew",
              fontSize: 24,
              padding: 16,
            },
          },
          String(props.label ?? "שלום עולם")
        )) as ComponentType<Record<string, unknown>>;

      const result = await orchestrateRender({
        cache,
        component: makeComponent,
        fetchFonts,
        height: 100,
        locale: "ar",
        props: { label: "שלום עולם" },
        templateContentHash: "fp-hebrew-hash",
        templateId: "font-hebrew-test",
        width: 300,
      });

      expect(result.bytes).toBeInstanceOf(Buffer);
      expect(result.bytes.length).toBeGreaterThan(0);
      expect(result.cacheHit).toBe(false);
      expect(result.format).toBe("png");
      expect(result.bytes[0]).toBe(PNG_HEADER[0]);

      cache.close();
    });

    it("renders different bytes for Latin vs Arabic font with same text content", async () => {
      tmpDir = mkdtempSync(path.join(tmpdir(), "stdout-lat-ar-diff-"));
      const { orchestrateRender } =
        await import("../orchestrate/orchestrate.js");
      const { RenderCache } = await import("../cache/render-cache.js");
      const { createFetchFontsFromConfig } =
        await import("../assets/font-config.js");
      const cache = new RenderCache({ cacheDir: tmpDir });
      await cache.init();

      const latinFetchFonts = createFetchFontsFromConfig({
        ar: [{ family: "Inter", weights: [400] }],
      });

      const arabicFetchFonts = createFetchFontsFromConfig({
        ar: [{ family: "IBM Plex Sans Arabic", weights: [400] }],
      });

      const makeComponent = ((props: Record<string, unknown>) =>
        createElement(
          "div",
          {
            style: {
              fontFamily: props.fontFamily as string,
              fontSize: 24,
              padding: 16,
            },
          },
          String(props.label ?? "Hello")
        )) as ComponentType<Record<string, unknown>>;

      const latinResult = await orchestrateRender({
        cache,
        component: makeComponent,
        fetchFonts: latinFetchFonts,
        height: 100,
        locale: "ar",
        props: { fontFamily: "Inter", label: "Hello" },
        templateContentHash: "fp-lat-ar-diff-hash",
        templateId: "font-lat-ar-diff",
        width: 200,
      });

      const { clearFontCache } = await import("../assets/assets-resolver.js");
      clearFontCache();

      const arabicResult = await orchestrateRender({
        cache,
        component: makeComponent,
        fetchFonts: arabicFetchFonts,
        height: 100,
        locale: "ar",
        props: { fontFamily: "IBM Plex Sans Arabic", label: "Hello" },
        templateContentHash: "fp-lat-ar-diff-hash",
        templateId: "font-lat-ar-diff",
        width: 200,
      });

      expect(latinResult.bytes).toBeInstanceOf(Buffer);
      expect(arabicResult.bytes).toBeInstanceOf(Buffer);
      expect(latinResult.bytes[0]).toBe(PNG_HEADER[0]);
      expect(arabicResult.bytes[0]).toBe(PNG_HEADER[0]);
      expect(latinResult.bytes).not.toStrictEqual(arabicResult.bytes);

      cache.close();
    });
  });

  describe("font weight variation", () => {
    afterEach(async () => {
      const { __resetRendererForTesting } =
        await import("../engine/renderer.js");
      __resetRendererForTesting();
      const { clearFontCache } = await import("../assets/assets-resolver.js");
      clearFontCache();
    });

    it("font-weight 400 vs 700 produce different bytes", async () => {
      tmpDir = mkdtempSync(path.join(tmpdir(), "stdout-weight-"));
      const { orchestrateRender } =
        await import("../orchestrate/orchestrate.js");
      const { RenderCache } = await import("../cache/render-cache.js");
      const { createFetchFontsFromConfig } =
        await import("../assets/font-config.js");
      const cache = new RenderCache({ cacheDir: tmpDir });
      await cache.init();

      const fetchFonts = createFetchFontsFromConfig({
        ar: [{ family: "Inter", weights: [400, 700] }],
      });

      const makeComponent = ((props: Record<string, unknown>) =>
        createElement(
          "div",
          {
            style: {
              fontFamily: "Inter",
              fontSize: 24,
              fontWeight: props.fontWeight as number,
              padding: 16,
            },
          },
          String(props.label ?? "Weight")
        )) as ComponentType<Record<string, unknown>>;

      const lightResult = await orchestrateRender({
        cache,
        component: makeComponent,
        fetchFonts,
        height: 100,
        locale: "ar",
        props: { fontWeight: 400, label: "Weight" },
        templateContentHash: "fp-weight-hash",
        templateId: "font-weight-test",
        width: 200,
      });

      const boldResult = await orchestrateRender({
        cache,
        component: makeComponent,
        fetchFonts,
        height: 100,
        locale: "ar",
        props: { fontWeight: 700, label: "Weight" },
        templateContentHash: "fp-weight-hash",
        templateId: "font-weight-test",
        width: 200,
      });

      expect(lightResult.bytes).toBeInstanceOf(Buffer);
      expect(boldResult.bytes).toBeInstanceOf(Buffer);
      expect(lightResult.bytes[0]).toBe(PNG_HEADER[0]);
      expect(boldResult.bytes[0]).toBe(PNG_HEADER[0]);
      expect(lightResult.bytes).not.toStrictEqual(boldResult.bytes);

      cache.close();
    });
  });

  describe("multiple font families per locale", () => {
    afterEach(async () => {
      const { __resetRendererForTesting } =
        await import("../engine/renderer.js");
      __resetRendererForTesting();
      const { clearFontCache } = await import("../assets/assets-resolver.js");
      clearFontCache();
    });

    it("renders with multiple families and CSS font-family fallback", async () => {
      tmpDir = mkdtempSync(path.join(tmpdir(), "stdout-multi-"));
      const { orchestrateRender } =
        await import("../orchestrate/orchestrate.js");
      const { RenderCache } = await import("../cache/render-cache.js");
      const { createFetchFontsFromConfig } =
        await import("../assets/font-config.js");
      const cache = new RenderCache({ cacheDir: tmpDir });
      await cache.init();

      const fetchFonts = createFetchFontsFromConfig({
        ar: [
          { family: "Inter", weights: [400] },
          { family: "Noto Sans Arabic", weights: [400] },
        ],
      });

      const makeComponent = ((props: Record<string, unknown>) =>
        createElement(
          "div",
          {
            style: {
              fontFamily: "Inter, 'Noto Sans Arabic'",
              fontSize: 24,
              padding: 16,
            },
          },
          String(props.label ?? "مرحبا")
        )) as ComponentType<Record<string, unknown>>;

      const result = await orchestrateRender({
        cache,
        component: makeComponent,
        fetchFonts,
        height: 100,
        locale: "ar",
        props: { label: "مرحبا" },
        templateContentHash: "fp-multi-hash",
        templateId: "font-multi-test",
        width: 300,
      });

      expect(result.bytes).toBeInstanceOf(Buffer);
      expect(result.bytes.length).toBeGreaterThan(0);
      expect(result.cacheHit).toBe(false);
      expect(result.format).toBe("png");
      expect(result.bytes[0]).toBe(PNG_HEADER[0]);

      cache.close();
    });

    it("reordering font family fallback changes output", async () => {
      tmpDir = mkdtempSync(path.join(tmpdir(), "stdout-order-"));
      const { orchestrateRender } =
        await import("../orchestrate/orchestrate.js");
      const { RenderCache } = await import("../cache/render-cache.js");
      const { createFetchFontsFromConfig } =
        await import("../assets/font-config.js");
      const cache = new RenderCache({ cacheDir: tmpDir });
      await cache.init();

      const fetchFonts = createFetchFontsFromConfig({
        ar: [
          { family: "Inter", weights: [400] },
          { family: "Roboto", weights: [400] },
        ],
      });

      const makeComponent = ((props: Record<string, unknown>) =>
        createElement(
          "div",
          {
            style: {
              fontFamily: props.fontFamily as string,
              fontSize: 24,
              padding: 16,
            },
          },
          String(props.label ?? "Hello")
        )) as ComponentType<Record<string, unknown>>;

      const resultA = await orchestrateRender({
        cache,
        component: makeComponent,
        fetchFonts,
        height: 100,
        locale: "ar",
        props: { fontFamily: "Inter, Roboto", label: "Hello" },
        templateContentHash: "fp-order-hash",
        templateId: "font-order-test",
        width: 300,
      });

      const { clearFontCache } = await import("../assets/assets-resolver.js");
      clearFontCache();

      const resultB = await orchestrateRender({
        cache,
        component: makeComponent,
        fetchFonts,
        height: 100,
        locale: "ar",
        props: { fontFamily: "Roboto, Inter", label: "Hello" },
        templateContentHash: "fp-order-hash",
        templateId: "font-order-test",
        width: 300,
      });

      expect(resultA.bytes).toBeInstanceOf(Buffer);
      expect(resultB.bytes).toBeInstanceOf(Buffer);
      expect(resultA.bytes[0]).toBe(PNG_HEADER[0]);
      expect(resultB.bytes[0]).toBe(PNG_HEADER[0]);
      expect(resultA.bytes).not.toStrictEqual(resultB.bytes);

      cache.close();
    });
  });

  describe("font error handling", () => {
    afterEach(async () => {
      const { __resetRendererForTesting } =
        await import("../engine/renderer.js");
      __resetRendererForTesting();
      const { clearFontCache } = await import("../assets/assets-resolver.js");
      clearFontCache();
    });

    it("gracefully handles non-existent font family and still produces valid PNG", async () => {
      tmpDir = mkdtempSync(path.join(tmpdir(), "stdout-bogus-"));
      const { orchestrateRender } =
        await import("../orchestrate/orchestrate.js");
      const { RenderCache } = await import("../cache/render-cache.js");
      const { createFetchFontsFromConfig } =
        await import("../assets/font-config.js");
      const cache = new RenderCache({ cacheDir: tmpDir });
      await cache.init();

      const fetchFonts = createFetchFontsFromConfig({
        ar: [{ family: "NonExistentFontName", weights: [400] }],
      });

      const makeComponent = ((props: Record<string, unknown>) =>
        createElement(
          "div",
          {
            style: {
              fontSize: 24,
              padding: 16,
            },
          },
          String(props.label ?? "Fallback")
        )) as ComponentType<Record<string, unknown>>;

      const result = await orchestrateRender({
        cache,
        component: makeComponent,
        fetchFonts,
        height: 100,
        locale: "ar",
        props: { label: "Fallback" },
        templateContentHash: "fp-bogus-hash",
        templateId: "font-bogus-test",
        width: 300,
      });

      expect(result.bytes).toBeInstanceOf(Buffer);
      expect(result.bytes.length).toBeGreaterThan(0);
      expect(result.cacheHit).toBe(false);
      expect(result.format).toBe("png");
      expect(result.bytes[0]).toBe(PNG_HEADER[0]);

      cache.close();
    });

    it("gracefully handles empty font config array for a locale", async () => {
      tmpDir = mkdtempSync(path.join(tmpdir(), "stdout-emptycfg-"));
      const { orchestrateRender } =
        await import("../orchestrate/orchestrate.js");
      const { RenderCache } = await import("../cache/render-cache.js");
      const { createFetchFontsFromConfig } =
        await import("../assets/font-config.js");
      const cache = new RenderCache({ cacheDir: tmpDir });
      await cache.init();

      const fetchFonts = createFetchFontsFromConfig({
        ar: [],
      });

      const makeComponent = ((props: Record<string, unknown>) =>
        createElement(
          "div",
          {
            style: {
              fontSize: 24,
              padding: 16,
            },
          },
          String(props.label ?? "Empty config")
        )) as ComponentType<Record<string, unknown>>;

      const result = await orchestrateRender({
        cache,
        component: makeComponent,
        fetchFonts,
        height: 100,
        locale: "ar",
        props: { label: "Empty config" },
        templateContentHash: "fp-emptycfg-hash",
        templateId: "font-emptycfg-test",
        width: 300,
      });

      expect(result.bytes).toBeInstanceOf(Buffer);
      expect(result.bytes.length).toBeGreaterThan(0);
      expect(result.cacheHit).toBe(false);
      expect(result.format).toBe("png");
      expect(result.bytes[0]).toBe(PNG_HEADER[0]);

      cache.close();
    });
  });

  describe("font + format combinations", () => {
    afterEach(async () => {
      const { __resetRendererForTesting } =
        await import("../engine/renderer.js");
      __resetRendererForTesting();
      const { clearFontCache } = await import("../assets/assets-resolver.js");
      clearFontCache();
    });

    it("renders font with jpeg format and produces valid JPEG", async () => {
      tmpDir = mkdtempSync(path.join(tmpdir(), "stdout-fontjpeg-"));
      const { orchestrateRender } =
        await import("../orchestrate/orchestrate.js");
      const { RenderCache } = await import("../cache/render-cache.js");
      const { createFetchFontsFromConfig } =
        await import("../assets/font-config.js");
      const cache = new RenderCache({ cacheDir: tmpDir });
      await cache.init();

      const fetchFonts = createFetchFontsFromConfig({
        ar: [{ family: "Inter", weights: [400] }],
      });

      const makeComponent = ((props: Record<string, unknown>) =>
        createElement(
          "div",
          {
            style: {
              fontFamily: "Inter",
              fontSize: 24,
              padding: 16,
            },
          },
          String(props.label ?? "JPEG Font")
        )) as ComponentType<Record<string, unknown>>;

      const result = await orchestrateRender({
        cache,
        component: makeComponent,
        fetchFonts,
        format: "jpeg",
        height: 100,
        locale: "ar",
        props: { label: "JPEG Font" },
        templateContentHash: "fp-fontjpeg-hash",
        templateId: "font-jpeg-test",
        width: 300,
      });

      expect(result.bytes).toBeInstanceOf(Buffer);
      expect(result.bytes.length).toBeGreaterThan(0);
      expect(result.cacheHit).toBe(false);
      expect(result.format).toBe("jpeg");
      expect(result.bytes[0]).toBe(255);
      expect(result.bytes[1]).toBe(216);
      expect(result.width).toBe(300);
      expect(result.height).toBe(100);

      cache.close();
    });
  });

  describe("orchestrateMeasure with real Renderer", () => {
    afterEach(async () => {
      const { __resetRendererForTesting } =
        await import("../engine/renderer.js");
      __resetRendererForTesting();
    });

    it("returns dimensions through the full orchestration pipeline", async () => {
      tmpDir = mkdtempSync(path.join(tmpdir(), "stdout-fullpipe-meas-"));
      const { orchestrateMeasure } =
        await import("../orchestrate/orchestrate.js");
      const { RenderCache } = await import("../cache/render-cache.js");
      const cache = new RenderCache({ cacheDir: tmpDir });
      await cache.init();

      const makeComponent = ((props: Record<string, unknown>) =>
        createElement(
          "div",
          null,
          String(props.label ?? "measure")
        )) as ComponentType<Record<string, unknown>>;

      const result = await orchestrateMeasure({
        cache,
        component: makeComponent,
        props: { label: "measure test" },
        templateContentHash: "fp-meas-hash",
        templateId: "measure-test",
      });

      expect(result.width).toBeGreaterThan(0);
      expect(result.height).toBeGreaterThan(0);
      expect(result.durationMs).toBeGreaterThan(0);

      cache.close();
    });
  });
});
