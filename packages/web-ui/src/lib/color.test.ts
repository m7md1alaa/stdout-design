import { describe, expect, it } from "bun:test";

import { hsvToRgb, parseHex, rgbToHsv, toHex } from "./color";

describe("parseHex", () => {
  it("reads 3, 4, 6 and 8 digit forms", () => {
    expect(parseHex("#f80")).toEqual({ a: 1, b: 0, g: 136, r: 255 });
    expect(parseHex("#ff8800")).toEqual({ a: 1, b: 0, g: 136, r: 255 });
    expect(parseHex("#f808")?.a).toBeCloseTo(0.533, 2);
    expect(parseHex("#ff880080")?.a).toBeCloseTo(0.502, 2);
  });

  it("rejects anything else", () => {
    expect(parseHex("ff8800")).toBeNull();
    expect(parseHex("#ff88")).not.toBeNull();
    expect(parseHex("#ff880")).toBeNull();
    expect(parseHex("oklch(0.7 0.1 40)")).toBeNull();
    expect(parseHex("")).toBeNull();
  });
});

describe("toHex", () => {
  it("writes six digits for opaque colors and eight for translucent ones", () => {
    expect(toHex({ a: 1, b: 0, g: 136, r: 255 })).toBe("#ff8800");
    expect(toHex({ a: 0.5, b: 0, g: 136, r: 255 })).toBe("#ff880080");
  });

  it("clamps out-of-range channels", () => {
    expect(toHex({ a: 1, b: -5, g: 300, r: 0 })).toBe("#00ff00");
  });
});

describe("hsv conversion", () => {
  it("round-trips through hsv", () => {
    for (const hex of [
      "#ff0000",
      "#00ff00",
      "#0000ff",
      "#336699",
      "#ffffff",
      "#000000",
    ]) {
      const rgb = parseHex(hex);
      expect(rgb).not.toBeNull();
      expect(toHex(hsvToRgb(rgbToHsv(rgb as never)))).toBe(hex);
    }
  });

  it("puts primaries on the expected hues", () => {
    expect(rgbToHsv({ a: 1, b: 0, g: 0, r: 255 }).h).toBe(0);
    expect(rgbToHsv({ a: 1, b: 0, g: 255, r: 0 }).h).toBe(120);
    expect(rgbToHsv({ a: 1, b: 255, g: 0, r: 0 }).h).toBe(240);
  });

  it("keeps alpha through hsvToRgb", () => {
    expect(hsvToRgb({ h: 0, s: 1, v: 1 }, 0.5).a).toBe(0.5);
  });
});
