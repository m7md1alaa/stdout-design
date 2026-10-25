import { describe, expect, it } from "bun:test";

import {
  BUILT_IN_FONTS,
  fontEntriesFor,
  fontSetKey,
  scriptOf,
} from "./locale-fonts.js";

const anton = { family: "Anton", source: "google" as const, weights: [400] };
const lalezar = { family: "Lalezar", source: "google" as const };

describe("scriptOf", () => {
  it("classifies ar and its regional variants as Arabic", () => {
    expect(scriptOf("ar")).toBe("arabic");
    expect(scriptOf("ar-EG")).toBe("arabic");
  });

  it("classifies everything else as Latin", () => {
    expect(scriptOf("en")).toBe("latin");
    expect(scriptOf("default")).toBe("latin");
    expect(scriptOf("AR")).toBe("latin");
  });
});

describe("fontEntriesFor", () => {
  it("uses the locale's own entry first", () => {
    expect(fontEntriesFor({ default: [anton], en: [lalezar] }, "en")).toEqual([
      lalezar,
    ]);
  });

  it("falls back to default for Latin locales", () => {
    expect(fontEntriesFor({ default: [anton] }, "fr")).toEqual([anton]);
  });

  it("gives Arabic locales the built-in Arabic face, not the Latin default", () => {
    expect(fontEntriesFor({ default: [anton] }, "ar-EG")).toEqual(
      BUILT_IN_FONTS.arabic
    );
  });

  it("gives Arabic locales the built-in face when there is no config", () => {
    expect(fontEntriesFor(undefined, "ar")).toEqual(BUILT_IN_FONTS.arabic);
  });

  it("returns nothing for a Latin locale with no config", () => {
    expect(fontEntriesFor(undefined, "en")).toEqual([]);
  });

  it("ignores entries that are not arrays", () => {
    expect(fontEntriesFor({ en: "Anton" as never }, "en")).toEqual([]);
  });
});

describe("fontSetKey", () => {
  it("is the same for locales that resolve to the same fonts", () => {
    const fonts = { default: [anton] };
    expect(fontSetKey(fontEntriesFor(fonts, "en"))).toBe(
      fontSetKey(fontEntriesFor(fonts, "fr"))
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
