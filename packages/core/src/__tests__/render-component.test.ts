import { afterEach, describe, expect, it, mock } from "bun:test";
import { existsSync, mkdirSync, mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";

import type { ComponentType } from "react";
import { createElement } from "react";
import { z } from "zod";

import { prepareImagesMock } from "./test-helpers/takumi-helpers-mock.js";

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
  prepareImages: prepareImagesMock,
}));

class MockRenderer {
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
}

mock.module("takumi-js/node", () => ({ Renderer: MockRenderer }));

const { renderComponent } = await import("../orchestrate/single.js");

const SimpleComponent = ((props: Record<string, unknown>) =>
  createElement("div", null, String(props.name))) as ComponentType<
  Record<string, unknown>
>;

const propsSchema = z.object({ name: z.string() });

describe("renderComponent", () => {
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

  it("renders a component to an output file and returns the path", async () => {
    tmpDir = mkdtempSync(path.join(tmpdir(), "stdout-test-"));
    mkdirSync(tmpDir, { recursive: true });

    const result = await renderComponent({
      component: SimpleComponent,
      outDir: tmpDir,
      preset: { height: 100, id: "test-preset", width: 100 },
      props: { name: "hello" },
      propsSchema,
    });

    expect(result.outputPath).toContain(tmpDir);
    expect(existsSync(result.outputPath)).toBe(true);
  });
});
