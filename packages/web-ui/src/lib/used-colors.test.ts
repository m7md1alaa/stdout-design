import { describe, expect, it } from "bun:test";

import { collectUsedColors } from "./used-colors";

const color = (name: string) => ({
  name,
  path: name,
  schema: { type: "string", "x-field": { kind: "color" } },
});

describe("collectUsedColors", () => {
  it("lists distinct colors in field order, lowercased", () => {
    const fields = [color("a"), color("b"), color("c")];
    expect(
      collectUsedColors(fields, { a: "#FF0000", b: "#00ff00", c: "#ff0000" })
    ).toEqual(["#ff0000", "#00ff00"]);
  });

  it("skips non-color fields and invalid values", () => {
    const fields = [
      color("a"),
      { name: "t", path: "t", schema: { type: "string" } },
    ];
    expect(collectUsedColors(fields, { a: "red", t: "#ffffff" })).toEqual([]);
  });
});
