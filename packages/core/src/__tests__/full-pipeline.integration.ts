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
      const result = await compileTemplate(element, { width: 50 });

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
