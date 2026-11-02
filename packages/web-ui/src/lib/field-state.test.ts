import { describe, expect, it } from "bun:test";

import { isModified, valuesEqual } from "./field-state";

describe("valuesEqual", () => {
  it("compares nested arrays and objects by value", () => {
    expect(valuesEqual([{ a: 1 }, 2], [{ a: 1 }, 2])).toBe(true);
    expect(valuesEqual([{ a: 1 }], [{ a: 2 }])).toBe(false);
    expect(valuesEqual([1], [1, 2])).toBe(false);
    expect(valuesEqual([], {})).toBe(false);
  });
});

describe("isModified", () => {
  it("is false for the default and for a missing value", () => {
    expect(isModified("#fff", "#fff")).toBe(false);
    expect(isModified(undefined, "#fff")).toBe(false);
  });

  it("is true once the value differs", () => {
    expect(isModified("#000", "#fff")).toBe(true);
    expect(isModified([1, 2], [1])).toBe(true);
  });
});
