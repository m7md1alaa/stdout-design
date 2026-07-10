import { afterEach, describe, expect, it, mock } from "bun:test";
import { existsSync, mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";

mock.module("takumi-js/helpers/jsx", () => ({
  fromJsx: mock(() =>
    Promise.resolve({
      node: { type: "container" },
      stylesheets: [] as string[],
    })
  ),
}));

mock.module("takumi-js/node", () => ({
  Renderer: class {
    render = mock(() => Promise.resolve(Buffer.from("rendered")));
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

mock.module("@takumi-rs/helpers", () => ({
  googleFonts: mock(() =>
    Promise.resolve([
      { data: new Uint8Array([0, 1, 2]), name: "Noto Sans Arabic" },
    ])
  ),
}));

const { resetRenderer } = await import("../node/renderer.js");
resetRenderer();

const { expandMatrix } = await import("../batch/matrix.js");
const { renderOne } = await import("../batch/render-one.js");

describe("expandMatrix locale injection", () => {
  it("injects locale into cell props for each locale", () => {
    const cells = expandMatrix({
      locales: [{ id: "en" }, { data: { name: "مرحبا" }, id: "ar" }],
      presets: [{ height: 100, id: "test", width: 100 }],
      rows: [{ key: "row-1", name: "hello" }],
    });

    expect(cells).toHaveLength(2);
    // eslint-disable-next-line typescript/no-non-null-assertion
    expect(cells[0]!.locale).toBe("en");
    // eslint-disable-next-line typescript/no-non-null-assertion
    expect(cells[0]!.props.locale).toBe("en");
    // eslint-disable-next-line typescript/no-non-null-assertion
    expect(cells[1]!.locale).toBe("ar");
    // eslint-disable-next-line typescript/no-non-null-assertion
    expect(cells[1]!.props.locale).toBe("ar");
  });

  it("merges locale data strings over base props", () => {
    const cells = expandMatrix({
      locales: [{ data: { name: "مرحبا" }, id: "ar" }],
      presets: [{ height: 100, id: "test", width: 100 }],
      rows: [{ key: "row-1", name: "hello" }],
    });

    // eslint-disable-next-line typescript/no-non-null-assertion
    expect(cells[0]!.props.name).toBe("مرحبا");
    // eslint-disable-next-line typescript/no-non-null-assertion
    expect(cells[0]!.props.locale).toBe("ar");
  });

  it("merges locale data arrays over base props", () => {
    const cells = expandMatrix({
      locales: [{ data: { items: ["مفتوح", "المصدر"] }, id: "ar" }],
      presets: [{ height: 100, id: "test", width: 100 }],
      rows: [{ items: ["open", "source"], key: "row-1" }],
    });

    // eslint-disable-next-line typescript/no-non-null-assertion
    expect(cells[0]!.props.items).toEqual(["مفتوح", "المصدر"]);
  });

  it("does not clobber non-matching types during merge", () => {
    const cells = expandMatrix({
      locales: [{ data: { count: 42 }, id: "ar" }],
      presets: [{ height: 100, id: "test", width: 100 }],
      rows: [{ count: 1, key: "row-1" }],
    });

    // eslint-disable-next-line typescript/no-non-null-assertion
    expect(cells[0]!.props.count).toBe(1);
  });
});

describe("renderOne with locale", () => {
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
    resetRenderer();
  });

  it("produces output for ar locale with renderOptions", async () => {
    tmpDir = mkdtempSync(path.join(tmpdir(), "stdout-locale-"));
    const { RenderCache } = await import("../node/render-cache.js");
    const cache = new RenderCache({ cacheDir: tmpDir });
    await cache.init();

    const result = await renderOne({
      cache,
      compiledTemplate: { node: { type: "container" }, stylesheets: [] },
      contentHash: "abc123",
      filename: "test-ar.png",
      height: 100,
      locale: "ar",
      outDir: tmpDir,
      props: { locale: "ar", name: "مرحبا" },
      renderOptions: {
        fontFamilies: ["Noto Sans Arabic"],
        fonts: [{ data: new Uint8Array([0, 1, 2]), name: "Noto Sans Arabic" }],
      },
      templateId: "test",
      width: 100,
    });

    expect(result.cacheHit).toBe(false);
    expect(existsSync(result.outputPath)).toBe(true);
    expect(result.durationMs).toBeGreaterThan(0);
    cache.close();
  });

  it("produces output for en locale without renderOptions", async () => {
    tmpDir = mkdtempSync(path.join(tmpdir(), "stdout-locale-en-"));
    const { RenderCache } = await import("../node/render-cache.js");
    const cache = new RenderCache({ cacheDir: tmpDir });
    await cache.init();

    const result = await renderOne({
      cache,
      compiledTemplate: { node: { type: "container" }, stylesheets: [] },
      contentHash: "xyz789",
      filename: "test-en.png",
      height: 100,
      locale: "en",
      outDir: tmpDir,
      props: { name: "hello" },
      templateId: "test",
      width: 100,
    });

    expect(result.cacheHit).toBe(false);
    expect(existsSync(result.outputPath)).toBe(true);
    cache.close();
  });

  it("caches a second render of the same props", async () => {
    tmpDir = mkdtempSync(path.join(tmpdir(), "stdout-cache-hit-"));
    const { RenderCache } = await import("../node/render-cache.js");
    const cache = new RenderCache({ cacheDir: tmpDir });
    await cache.init();

    const props = { locale: "ar", name: "cached" };

    const first = await renderOne({
      cache,
      compiledTemplate: { node: { type: "container" }, stylesheets: [] },
      contentHash: "hash1",
      filename: "first.png",
      height: 100,
      locale: "ar",
      outDir: tmpDir,
      props,
      templateId: "test",
      width: 100,
    });

    const second = await renderOne({
      cache,
      compiledTemplate: { node: { type: "container" }, stylesheets: [] },
      contentHash: "hash1",
      filename: "second.png",
      height: 100,
      locale: "ar",
      outDir: tmpDir,
      props,
      templateId: "test",
      width: 100,
    });

    expect(first.cacheHit).toBe(false);
    expect(second.cacheHit).toBe(true);
    cache.close();
  });
});
