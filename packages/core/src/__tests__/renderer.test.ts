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
  registerFont = mock(
    (_font: unknown, _key?: string | null, _signal?: AbortSignal) =>
      Promise.resolve([{ faces: [], name: "Geist" }])
  );
}

mock.module("takumi-js/node", () => ({ Renderer: MockRenderer }));

const {
  __getRendererForTesting,
  __resetRendererForTesting,
  renderToPixels,
  measureTemplate,
  renderAutoSized,
  registerFont,
} = await import("../engine/renderer.js");

const getMockRenderer = (): MockRenderer =>
  __getRendererForTesting() as unknown as MockRenderer;

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

describe("stylesheets", () => {
  it("are sent to Takumi as css, merged with the template's own", async () => {
    __resetRendererForTesting();
    await renderToPixels(
      { node: { type: "container" }, stylesheets: ["b {}"] },
      { height: 600, width: 800 },
      { stylesheets: ["a {}"] }
    );
    const [, options] = getMockRenderer().render.mock.calls[0] as unknown as [
      unknown,
      Record<string, unknown>,
    ];
    expect(options.css).toEqual(["a {}", "b {}"]);
    expect(options).not.toHaveProperty("stylesheets");
  });
});

describe("registerFont", () => {
  it("passes the abort signal in Takumi's third slot and returns family names", async () => {
    __resetRendererForTesting();
    const { signal } = new AbortController();
    const families = await registerFont(
      "https://example.com/font.woff2",
      signal
    );
    expect(families).toEqual(["Geist"]);
    expect(getMockRenderer().registerFont.mock.calls[0]).toEqual([
      "https://example.com/font.woff2",
      null,
      signal,
    ]);
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
