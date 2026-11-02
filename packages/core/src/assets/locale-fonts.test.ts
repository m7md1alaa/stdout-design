import { describe, expect, it } from "bun:test";

import {
  BUILT_IN_FONTS,
  configuredFontEntries,
  fontSetKey,
} from "./locale-fonts.js";

const anton = { family: "Anton", source: "google" as const, weights: [400] };
const lalezar = { family: "Lalezar", source: "google" as const };

describe("configuredFontEntries", () => {
  it("uses the locale's own entry first", () => {
    expect(
      configuredFontEntries({ default: [anton], en: [lalezar] }, "en")
    ).toEqual([lalezar]);
  });

  it("falls back to default for Latin locales", () => {
    expect(configuredFontEntries({ default: [anton] }, "fr")).toEqual([anton]);
  });

  it("skips the Latin default for non-Latin locales", () => {
    expect(configuredFontEntries({ default: [anton] }, "ar-EG")).toEqual([]);
    expect(configuredFontEntries({ default: [anton] }, "he")).toEqual([]);
  });

  it("returns nothing when there is no config", () => {
    expect(configuredFontEntries(undefined, "ar")).toEqual([]);
  });

  it("returns nothing for a Latin locale with no config", () => {
    expect(configuredFontEntries(undefined, "en")).toEqual([]);
  });

  it("ignores entries that are not arrays", () => {
    expect(configuredFontEntries({ en: "Anton" as never }, "en")).toEqual([]);
  });
});

describe("BUILT_IN_FONTS", () => {
  it("has a face for every non-Latin script and none for Latin", () => {
    expect(BUILT_IN_FONTS.arabic.map((f) => f.family)).toEqual([
      "Noto Sans Arabic",
    ]);
    expect(BUILT_IN_FONTS.hebrew.map((f) => f.family)).toEqual([
      "Noto Sans Hebrew",
    ]);
    expect(BUILT_IN_FONTS.latin).toEqual([]);
  });
});

describe("fontSetKey", () => {
  it("is the same for locales that resolve to the same fonts", () => {
    const fonts = { default: [anton] };
    expect(fontSetKey(configuredFontEntries(fonts, "en"))).toBe(
      fontSetKey(configuredFontEntries(fonts, "fr"))
    );
  });

  it("differs when the order of fonts differs", () => {
    expect(fontSetKey([anton, lalezar])).not.toBe(fontSetKey([lalezar, anton]));
  });

  it("differs by config directory, since local paths resolve against it", () => {
    const local = {
      family: "Mine",
      path: "./mine.ttf",
      source: "local" as const,
    };
    expect(fontSetKey([local], "/a")).not.toBe(fontSetKey([local], "/b"));
  });
});
