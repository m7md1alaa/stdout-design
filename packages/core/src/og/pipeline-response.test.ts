import { describe, it, expect, mock, afterEach } from "bun:test";

import { createElement } from "react";

mock.module("takumi-js/helpers/jsx", () => ({
  fromJsx: mock(() =>
    Promise.resolve({ node: { type: "container" }, stylesheets: [] })
  ),
}));

class MockRenderer {
  render = mock(() => Promise.resolve(Buffer.from("og-pixels")));
  measure = mock(() =>
    Promise.resolve({
      children: [] as [],
      height: 630,
      runs: [] as [],
      transform: [1, 0, 0, 1, 0, 0] as [
        number,
        number,
        number,
        number,
        number,
        number,
      ],
      width: 1200,
    })
  );
  registerFont = mock(() => Promise.resolve([]));
}

mock.module("takumi-js/node", () => ({ Renderer: MockRenderer }));

const { renderOgResponse } = await import("./pipeline-response.js");

const el = createElement("div", null, "Hello OG");

describe("renderOgResponse", () => {
  afterEach(async () => {
    const { __resetRendererForTesting } = await import("../engine/renderer.js");
    __resetRendererForTesting();
  });

  it("returns a 200 Response with image/webp content-type by default", async () => {
    const res = await renderOgResponse(el);

    expect(res.status).toBe(200);
    expect(res.headers.get("content-type")).toBe("image/webp");
  });

  it("respects the format option", async () => {
    const res = await renderOgResponse(el, { format: "png" });

    expect(res.headers.get("content-type")).toBe("image/png");
  });

  it("respects the jpeg format option", async () => {
    const res = await renderOgResponse(el, { format: "jpeg" });

    expect(res.headers.get("content-type")).toBe("image/jpeg");
  });

  it("sets long-lived cache headers for successful responses", async () => {
    const res = await renderOgResponse(el);

    const cc = res.headers.get("cache-control");
    expect(cc).toContain("public");
    expect(cc).toContain("immutable");
    expect(cc).toMatch(/s-maxage=\d+/u);
    expect(res.headers.get("vary")).toBe("Accept");
  });

  it("returns the rendered bytes in the response body", async () => {
    const res = await renderOgResponse(el);

    const blob = await res.blob();
    const bytes = Buffer.from(await blob.arrayBuffer());
    expect(bytes.byteLength).toBeGreaterThan(0);
  });

  it("returns 500 with no-store cache on render failure", async () => {
    const { __resetRendererForTesting, __getRendererForTesting } =
      await import("../engine/renderer.js");
    __resetRendererForTesting();
    const renderer = __getRendererForTesting();
    renderer.render = mock(() =>
      Promise.reject(new Error("mock render failure"))
    );

    const res = await renderOgResponse(el);

    expect(res.status).toBe(500);
    expect(res.headers.get("cache-control")).toBe("no-store");
  });
});
