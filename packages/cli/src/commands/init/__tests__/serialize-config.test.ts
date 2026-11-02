import { describe, expect, test } from "bun:test";

import { serializeConfig, toLiteral } from "../serialize-config.js";

describe("toLiteral", () => {
  test("uses bare keys where possible and quotes the rest", () => {
    expect(toLiteral({ "bento-feature": 1, width: 2 })).toBe(
      '{ "bento-feature": 1, width: 2 }'
    );
  });

  test("keeps short values on one line and breaks long ones", () => {
    const presets = [
      { height: 1080, id: "instagram-square", platform: "instagram" },
      { height: 675, id: "x-card", platform: "x", width: 1200 },
    ];
    expect(toLiteral(presets)).toBe(`[
  { height: 1080, id: "instagram-square", platform: "instagram" },
  { height: 675, id: "x-card", platform: "x", width: 1200 },
]`);
  });

  test("prints empty objects and arrays without padding", () => {
    expect(toLiteral({ fonts: {}, list: [] })).toBe("{ fonts: {}, list: [] }");
  });

  test("drops undefined object entries", () => {
    expect(toLiteral({ defaultPreset: undefined, outDir: "./out" })).toBe(
      '{ outDir: "./out" }'
    );
  });
});

describe("serializeConfig", () => {
  test("writes a typed default export", () => {
    const source = serializeConfig({ presets: [], templates: {} });
    expect(source).toBe(`import type { StudioConfig } from "@stdout-design/cli";

const config: StudioConfig = { presets: [], templates: {} };

export default config;
`);
  });
});
