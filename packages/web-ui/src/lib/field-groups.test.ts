import { describe, expect, it } from "bun:test";

import { groupFields, groupFieldsByKind } from "./field-groups";

const field = (name: string, schema: Record<string, unknown>) => ({
  name,
  path: name,
  schema,
});

describe("groupFieldsByKind", () => {
  it("groups by kind, in a fixed order, keeping schema order inside", () => {
    const groups = groupFieldsByKind([
      field("items", { type: "array" }),
      field("headline", { type: "string" }),
      field("size", { type: "number" }),
      field("accentColor", { default: "#fff", type: "string" }),
      field("subtitle", { type: "string" }),
      field("dark", { type: "boolean" }),
    ]);
    expect(groups.map((g) => g.title)).toEqual([
      "Text",
      "Colors",
      "Settings",
      "Lists",
    ]);
    expect(groups[0]?.fields.map((f) => f.name)).toEqual([
      "headline",
      "subtitle",
    ]);
    expect(groups[2]?.fields.map((f) => f.name)).toEqual(["size", "dark"]);
  });

  it("drops empty groups", () => {
    const groups = groupFieldsByKind([field("a", { type: "string" })]);
    expect(groups.map((g) => g.title)).toEqual(["Text"]);
  });
});

describe("groupFields", () => {
  const fields = [
    field("headline", { type: "string" }),
    field("accent", { type: "string" }),
    field("size", { type: "number" }),
  ];

  it("follows the template's groups and key order", () => {
    const groups = groupFields(fields, [
      ["Style", ["size", "accent"]],
      ["Content", ["headline"]],
    ]);
    expect(groups.map((g) => g.title)).toEqual(["Style", "Content"]);
    expect(groups[0]?.fields.map((f) => f.name)).toEqual(["size", "accent"]);
  });

  it("puts omitted fields in a trailing Other group", () => {
    const groups = groupFields(fields, [["Content", ["headline"]]]);
    expect(groups.map((g) => g.title)).toEqual(["Content", "Other"]);
    expect(groups[1]?.fields.map((f) => f.name)).toEqual(["accent", "size"]);
  });

  it("covers every field under an object key", () => {
    const nested = [
      { name: "text", path: "title.text", schema: { type: "string" } },
      { name: "size", path: "title.size", schema: { type: "number" } },
    ];
    const groups = groupFields(nested, [["Title", ["title"]]]);
    expect(groups[0]?.fields).toHaveLength(2);
  });

  it("falls back to grouping by kind without a layout", () => {
    expect(groupFields(fields).map((g) => g.title)).toEqual([
      "Text",
      "Settings",
    ]);
  });
});
