import { describe, expect, it } from "bun:test";

import { readFieldLabel, resolveFieldKind } from "./resolve-field-kind";

describe("resolveFieldKind with x-field", () => {
  it("trusts the recorded kind over the prop's name and value", () => {
    expect(
      resolveFieldKind("backgroundColor", {
        default: "#fff",
        type: "string",
        "x-field": { kind: "text", translatable: true },
      })
    ).toEqual({ kind: "text", multiline: false });

    expect(
      resolveFieldKind("accent", {
        default: "#ff6a3d",
        type: "string",
        "x-field": { kind: "color", translatable: false },
      })
    ).toEqual({ kind: "color" });
  });

  it("reads multiline, select options, numbers, and lists", () => {
    expect(
      resolveFieldKind("body", {
        type: "string",
        "x-field": { kind: "text", multiline: true, translatable: true },
      })
    ).toEqual({ kind: "text", multiline: true });
    expect(
      resolveFieldKind("layout", {
        enum: ["grid", "stack"],
        type: "string",
        "x-field": { kind: "select", translatable: false },
      })
    ).toEqual({ kind: "enum", options: ["grid", "stack"] });
    expect(
      resolveFieldKind("count", {
        type: "integer",
        "x-field": { kind: "number", translatable: false },
      })
    ).toEqual({ kind: "number" });
    expect(
      resolveFieldKind("stats", {
        type: "array",
        "x-field": { kind: "list", translatable: false },
      })
    ).toEqual({ kind: "array" });
  });

  it("classifies an unknown kind by shape", () => {
    expect(
      resolveFieldKind("when", { type: "boolean", "x-field": { kind: "date" } })
    ).toEqual({ kind: "boolean" });
  });
});

describe("resolveFieldKind without x-field", () => {
  it("keeps the name and length heuristics", () => {
    expect(
      resolveFieldKind("accentColor", { default: "#000", type: "string" })
    ).toEqual({ kind: "color" });
    expect(resolveFieldKind("count", { type: "integer" })).toEqual({
      kind: "number",
    });
    expect(
      resolveFieldKind("body", { description: "x".repeat(61), type: "string" })
    ).toEqual({ kind: "text", multiline: true });
  });
});

describe("readFieldLabel", () => {
  it("reads the label a template set", () => {
    expect(
      readFieldLabel({ "x-field": { kind: "text", label: "Big title" } })
    ).toBe("Big title");
  });

  it("is undefined without one", () => {
    expect(readFieldLabel({ "x-field": { kind: "text" } })).toBeUndefined();
    expect(readFieldLabel({ type: "string" })).toBeUndefined();
  });
});
