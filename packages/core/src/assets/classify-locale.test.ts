import { describe, expect, it } from "bun:test";

import { classifyLocale } from "./classify-locale.js";

describe("classifyLocale", () => {
  it("identifies Arabic locales", () => {
    expect(classifyLocale("ar")).toEqual({ lang: "ar", needsArabic: true });
    expect(classifyLocale("ar-EG")).toEqual({ lang: "ar", needsArabic: true });
    expect(classifyLocale("ar-SA")).toEqual({ lang: "ar", needsArabic: true });
  });

  it("returns no lang for non-Arabic locales", () => {
    expect(classifyLocale("en")).toEqual({
      lang: undefined,
      needsArabic: false,
    });
    expect(classifyLocale("fr")).toEqual({
      lang: undefined,
      needsArabic: false,
    });
    expect(classifyLocale("default")).toEqual({
      lang: undefined,
      needsArabic: false,
    });
  });

  it("handles edge-case locale ids", () => {
    expect(classifyLocale("")).toEqual({
      lang: undefined,
      needsArabic: false,
    });
    expect(classifyLocale("ARA")).toEqual({
      lang: undefined,
      needsArabic: false,
    });
  });
});
