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
  getRenderer,
  resetRenderer,
  renderToPixels,
  measureTemplate,
  renderAutoSized,
} = await import("../node/renderer.js");

describe("getRenderer", () => {
  it("returns a renderer with render and measure methods", () => {
    const renderer = getRenderer();
    expect(renderer).toBeDefined();
    expect(typeof renderer.render).toBe("function");
    expect(typeof renderer.measure).toBe("function");
  });

  it("returns the same instance on consecutive calls", () => {
    const a = getRenderer();
    const b = getRenderer();
    expect(a).toBe(b);
  });

  it("returns the same instance when config is unchanged", () => {
    resetRenderer();
    const config = { fonts: [], persistentImages: [] };
    const a = getRenderer(config);
    const b = getRenderer(config);
    expect(a).toBe(b);
  });

  it("creates a new instance when config changes", () => {
    resetRenderer();
    const a = getRenderer({ fonts: [] });
    const b = getRenderer({
      fonts: [{ data: Buffer.from("test"), name: "Inter", weight: 400 }],
    });
    expect(a).not.toBe(b);
  });

  it("resetRenderer forces a fresh instance on next call", () => {
    resetRenderer();
    const a = getRenderer();
    resetRenderer();
    const b = getRenderer();
    expect(a).not.toBe(b);
  });

  afterAll(() => {
    resetRenderer();
  });
});

describe("renderToPixels", () => {
  it("returns rendered pixels with correct dimensions and format", async () => {
    resetRenderer();
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
    resetRenderer();
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
    resetRenderer();
    const result = await renderAutoSized({
      node: { type: "container" },
      stylesheets: [],
    });
    expect(result.width).toBe(200);
    expect(result.height).toBe(100);
  });
});
