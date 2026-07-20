import { describe, it, expect, mock, afterAll } from "bun:test";

class MockRenderer {
  render = mock(() => Buffer.from("rendered"));
  measure = mock(() => ({
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
  }));
  registerFont = mock(() => Promise.resolve([]));
}

mock.module("takumi-js/node", () => ({ Renderer: MockRenderer }));

const {
  __getRendererForTesting,
  __resetRendererForTesting,
  renderToPixels,
  measureTemplate,
  renderAutoSized,
} = await import("../engine/renderer.js");

describe("__getRendererForTesting", () => {
  it("returns a renderer with render and measure methods", () => {
    const renderer = __getRendererForTesting();
    expect(renderer).toBeDefined();
    expect(typeof renderer.render).toBe("function");
    expect(typeof renderer.measure).toBe("function");
  });

  it("returns the same instance on consecutive calls", () => {
    const a = __getRendererForTesting();
    const b = __getRendererForTesting();
    expect(a).toBe(b);
  });

  it("returns the same instance when called twice without reset", () => {
    __resetRendererForTesting();
    const a = __getRendererForTesting();
    const b = __getRendererForTesting();
    expect(a).toBe(b);
  });

  it("__resetRendererForTesting creates a different instance", () => {
    __resetRendererForTesting();
    const a = __getRendererForTesting();
    __resetRendererForTesting();
    const b = __getRendererForTesting();
    expect(a).not.toBe(b);
  });

  it("__resetRendererForTesting forces a fresh instance on next call", () => {
    __resetRendererForTesting();
    const a = __getRendererForTesting();
    __resetRendererForTesting();
    const b = __getRendererForTesting();
    expect(a).not.toBe(b);
  });

  afterAll(() => {
    __resetRendererForTesting();
  });
});

describe("renderToPixels", () => {
  it("returns rendered pixels with correct dimensions and format", async () => {
    __resetRendererForTesting();
    const result = await renderToPixels(
      { node: { type: "container" }, stylesheets: [] },
      { height: 600, width: 800 }
    );
    expect(result).toEqual({
      bytes: Buffer.from("rendered"),
      format: "png",
      height: 600,
      width: 800,
    });
  });
});

describe("measureTemplate", () => {
  it("returns measured dimensions from the renderer", async () => {
    __resetRendererForTesting();
    const result = await measureTemplate({
      node: { type: "container" },
      stylesheets: [],
    });
    expect(result.width).toBe(200);
    expect(result.height).toBe(100);
  });
});

describe("renderAutoSized", () => {
  it("measures then renders at the measured size", async () => {
    __resetRendererForTesting();
    const result = await renderAutoSized({
      node: { type: "container" },
      stylesheets: [],
    });
    expect(result.width).toBe(200);
    expect(result.height).toBe(100);
  });
});
