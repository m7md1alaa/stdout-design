import { describe, expect, it } from "bun:test";

import { resolveCompareLocale } from "./view-mode";

describe("resolveCompareLocale", () => {
  const locales = ["en", "ar", "fr"];

  it("keeps a valid pick", () => {
    expect(resolveCompareLocale("fr", "en", locales)).toBe("fr");
  });

  it("falls back to the first other locale", () => {
    expect(resolveCompareLocale(null, "en", locales)).toBe("ar");
    expect(resolveCompareLocale("en", "en", locales)).toBe("ar");
    expect(resolveCompareLocale("de", "en", locales)).toBe("ar");
  });

  it("is null when there is nothing to compare with", () => {
    expect(resolveCompareLocale(null, "en", ["en"])).toBeNull();
  });
});
