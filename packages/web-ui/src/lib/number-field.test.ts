import { describe, expect, it } from "bun:test";

import {
  clampToBounds,
  isWithinBounds,
  parseNumberInput,
  resolveNumberStep,
  scrubValue,
} from "./number-field";

describe("resolveNumberStep", () => {
  it("uses multipleOf when the schema has it", () => {
    expect(resolveNumberStep({ multipleOf: 0.5, type: "number" })).toBe(0.5);
  });

  it("steps integers by 1", () => {
    expect(resolveNumberStep({ type: "integer" })).toBe(1);
  });

  it("steps a number with whole bounds and default by 1", () => {
    expect(
      resolveNumberStep({
        default: 72,
        maximum: 100,
        minimum: 0,
        type: "number",
      })
    ).toBe(1);
    expect(resolveNumberStep({ type: "number" })).toBe(1);
  });

  it("steps a 0..1 range by hundredths", () => {
    expect(
      resolveNumberStep({ default: 1, maximum: 1, minimum: 0, type: "number" })
    ).toBe(0.01);
  });

  it("steps a number with a fractional default or bound by hundredths", () => {
    expect(
      resolveNumberStep({
        default: 0.5,
        maximum: 100,
        minimum: 0,
        type: "number",
      })
    ).toBe(0.01);
    expect(resolveNumberStep({ minimum: 0.5, type: "number" })).toBe(0.01);
  });
});

describe("parseNumberInput", () => {
  it("parses numbers, including negatives and decimals", () => {
    expect(parseNumberInput("42")).toBe(42);
    expect(parseNumberInput(" -3.5 ")).toBe(-3.5);
    expect(parseNumberInput("0")).toBe(0);
  });

  it("returns null for empty and non-numeric input", () => {
    expect(parseNumberInput("")).toBeNull();
    expect(parseNumberInput("   ")).toBeNull();
    expect(parseNumberInput("abc")).toBeNull();
    expect(parseNumberInput("1e")).toBeNull();
    expect(parseNumberInput("Infinity")).toBeNull();
  });
});

describe("bounds", () => {
  const bounds = { maximum: 100, minimum: 10 };

  it("reports whether a value is inside the bounds", () => {
    expect(isWithinBounds(10, bounds)).toBe(true);
    expect(isWithinBounds(100, bounds)).toBe(true);
    expect(isWithinBounds(9, bounds)).toBe(false);
    expect(isWithinBounds(101, bounds)).toBe(false);
  });

  it("clamps to the bounds", () => {
    expect(clampToBounds(5, bounds)).toBe(10);
    expect(clampToBounds(500, bounds)).toBe(100);
    expect(clampToBounds(50, bounds)).toBe(50);
  });

  it("leaves a side open when the schema has no bound there", () => {
    expect(isWithinBounds(-1000, { maximum: 5 })).toBe(true);
    expect(clampToBounds(1000, { minimum: 0 })).toBe(1000);
    expect(clampToBounds(7, {})).toBe(7);
  });
});

describe("scrubValue", () => {
  it("moves one step per four pixels", () => {
    expect(scrubValue(10, 8, 1, {})).toBe(12);
    expect(scrubValue(10, -8, 1, {})).toBe(8);
    expect(scrubValue(10, 3, 1, {})).toBe(10);
  });

  it("avoids float noise for fractional steps", () => {
    expect(scrubValue(0.1, 8, 0.01, {})).toBe(0.12);
  });

  it("stays inside the bounds", () => {
    expect(scrubValue(9, 40, 1, { maximum: 10, minimum: 0 })).toBe(10);
    expect(scrubValue(1, -40, 1, { maximum: 10, minimum: 0 })).toBe(0);
  });
});
