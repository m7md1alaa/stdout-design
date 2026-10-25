import { beforeEach, describe, expect, it, mock } from "bun:test";

import type { Font } from "../engine/takumi-types-shim.js";

const stubFont: Font = { name: "test-font", weight: 400 } as Font;
const notoArabic: Font = { name: "Noto Sans Arabic", weight: 400 } as Font;

const mockGoogleFonts = mock<(...args: unknown[]) => Promise<Font[]>>(() =>
  Promise.resolve([notoArabic])
);

mock.module("@takumi-rs/helpers", () => ({
  googleFonts: mockGoogleFonts,
}));

const { resolveAssetsForLocale } = await import("./assets-resolver.js");
const { clearFontCache } = await import("./font-config.js");

describe("resolveAssetsForLocale", () => {
  beforeEach(() => {
    clearFontCache();
    mockGoogleFonts.mockClear();
  });

  it("classifies empty locale with no lang or fonts", async () => {
    const result = await resolveAssetsForLocale("", { title: "Hi" });

    expect(result.lang).toBeUndefined();
    expect(result.fonts).toEqual([]);
    expect(result.props.title).toBe("Hi");
  });

  it("treats uppercase locale codes as non-Arabic", async () => {
    const result = await resolveAssetsForLocale("ARA", { title: "Hi" });

    expect(result.lang).toBeUndefined();
    expect(result.fonts).toEqual([]);
  });

  it("does not introduce new keys from localeData", async () => {
    const props = { title: "Hello" };
    const localeData = { description: "Extra", title: "Bonjour" };

    const result = await resolveAssetsForLocale("en", props, { localeData });

    expect(result.props.title).toBe("Bonjour");
    expect(result.props).not.toHaveProperty("description");
  });

  it("does not override when types mismatch in localeData", async () => {
    const props = { count: 42, name: "Alice" };
    const localeData = { count: "forty-two", name: 99 };

    const result = await resolveAssetsForLocale("en", props, { localeData });

    expect(result.props.count).toBe(42);
    expect(result.props.name).toBe("Alice");
  });

  it("merges locale props and classifies the locale", async () => {
    const props = { count: 1, title: "Hello" };
    const localeData = { title: "Bonjour" };

    const result = await resolveAssetsForLocale("en", props, { localeData });

    expect(result.props.title).toBe("Bonjour");
    expect(result.props.count).toBe(1);
    expect(result.lang).toBeUndefined();
    expect(result.fonts).toEqual([]);
    expect(result.fontFamilies).toBeUndefined();
  });

  it("returns plain props when no localeData is provided", async () => {
    const props = { title: "Hello" };

    const result = await resolveAssetsForLocale("fr", props);

    expect(result.props).toEqual(props);
    expect(result.props).not.toBe(props);
    expect(result.lang).toBeUndefined();
  });

  it("resolves lang and fonts for Arabic locales", async () => {
    const props = { title: "Hello" };
    const fetchFonts = mock((_localeId: string) =>
      Promise.resolve({
        fontFamilies: ["Test Arabic"],
        fonts: [stubFont],
      })
    );

    const result = await resolveAssetsForLocale("ar-EG", props, {
      fetchFonts,
    });

    expect(result.lang).toBe("ar");
    expect(result.fonts).toEqual([stubFont]);
    expect(result.fontFamilies).toEqual(["Test Arabic"]);
    expect(fetchFonts).toHaveBeenCalledTimes(1);
    expect(fetchFonts).toHaveBeenCalledWith("ar-EG");
  });

  it("fetches config fonts for non-Arabic locales too", async () => {
    const props = { title: "Hello" };
    const fetchFonts = mock((_localeId: string) =>
      Promise.resolve({
        fontFamilies: ["Display"],
        fonts: [stubFont],
      })
    );

    const result = await resolveAssetsForLocale("en", props, { fetchFonts });

    expect(result.lang).toBeUndefined();
    expect(result.fonts).toEqual([stubFont]);
    expect(result.fontFamilies).toEqual(["Display"]);
    expect(fetchFonts).toHaveBeenCalledWith("en");
  });

  it("leaves non-Arabic locales on built-in fonts when the config has none", async () => {
    const fetchFonts = mock((_localeId: string) => Promise.resolve(null));

    const result = await resolveAssetsForLocale(
      "fr",
      { title: "Bonjour" },
      { fetchFonts }
    );

    expect(result.fonts).toEqual([]);
    expect(result.fontFamilies).toBeUndefined();
    expect(mockGoogleFonts).not.toHaveBeenCalled();
  });

  it("falls back to Noto Sans Arabic when an Arabic locale's fonts fail", async () => {
    const fetchFonts = mock((_localeId: string) => Promise.resolve(null));

    const result = await resolveAssetsForLocale(
      "ar-EG",
      { title: "مرحبا" },
      { fetchFonts }
    );

    expect(mockGoogleFonts).toHaveBeenCalledWith([
      { name: "Noto Sans Arabic", weight: [400, 700] },
    ]);
    expect(result.fonts).toEqual([notoArabic]);
    expect(result.fontFamilies).toEqual(["Noto Sans Arabic"]);
  });

  it("asks for the built-in Arabic fonts once when they fail to load", async () => {
    mockGoogleFonts.mockImplementationOnce(() =>
      Promise.reject(new Error("offline"))
    );

    const result = await resolveAssetsForLocale("ar", { title: "مرحبا" });

    expect(mockGoogleFonts).toHaveBeenCalledTimes(1);
    expect(result.fonts).toEqual([]);
  });

  it("calls loadLocaleData callback and merges results into props", async () => {
    const props = { title: "Hello" };
    const loadLocaleData = mock((_locale: string) =>
      Promise.resolve({ subtitle: "Extra", title: "Bonjour" })
    );

    const result = await resolveAssetsForLocale("en", props, {
      loadLocaleData,
    });

    expect(loadLocaleData).toHaveBeenCalledTimes(1);
    expect(loadLocaleData).toHaveBeenCalledWith("en");
    expect(result.props.title).toBe("Bonjour");
    expect(result.props.count).toBeUndefined();
    expect(result.props).not.toHaveProperty("subtitle");
  });

  it("handles loadLocaleData rejection gracefully", async () => {
    const props = { title: "Hello" };
    const loadLocaleData = mock((_locale: string) =>
      Promise.reject(new Error("network error"))
    );

    const result = await resolveAssetsForLocale("en", props, {
      loadLocaleData,
    });

    expect(result.props).toEqual(props);
    expect(loadLocaleData).toHaveBeenCalledTimes(1);
  });

  it("uses preResolvedFonts and skips fetchFonts while still classifying lang", async () => {
    const props = { title: "Hello" };
    const fetchFonts = mock((_localeId: string) =>
      Promise.resolve({
        fontFamilies: ["Should not be called"],
        fonts: [stubFont],
      })
    );

    const result = await resolveAssetsForLocale("ar-EG", props, {
      fetchFonts,
      preResolvedFontFamilies: ["PreResolvedFont"],
      preResolvedFonts: [stubFont],
    });

    expect(result.lang).toBe("ar");
    expect(result.fonts).toEqual([stubFont]);
    expect(result.fontFamilies).toEqual(["PreResolvedFont"]);
    expect(fetchFonts).toHaveBeenCalledTimes(0);
  });

  it("classifies lang correctly with preResolvedFonts for non-Arabic locale", async () => {
    const props = { title: "Hello" };

    const result = await resolveAssetsForLocale("en", props, {
      preResolvedFonts: [stubFont],
    });

    expect(result.lang).toBeUndefined();
    expect(result.fonts).toEqual([stubFont]);
  });

  it("preResolvedFonts for fonts, loadLocaleData for props when both provided", async () => {
    const props = { title: "Hello" };
    const fetchFonts = mock((_localeId: string) =>
      Promise.resolve({ fontFamilies: ["Unused"], fonts: [stubFont] })
    );
    const loadLocaleData = mock((_locale: string) =>
      Promise.resolve({ title: "Bonjour" })
    );

    const result = await resolveAssetsForLocale("ar", props, {
      fetchFonts,
      loadLocaleData,
      preResolvedFontFamilies: ["PreResolved"],
      preResolvedFonts: [stubFont],
    });

    expect(result.props.title).toBe("Bonjour");
    expect(result.fonts).toEqual([stubFont]);
    expect(result.fontFamilies).toEqual(["PreResolved"]);
    expect(result.lang).toBe("ar");
    expect(fetchFonts).toHaveBeenCalledTimes(0);
    expect(loadLocaleData).toHaveBeenCalledTimes(1);
  });
});
