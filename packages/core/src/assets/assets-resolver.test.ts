import { beforeEach, describe, expect, it, mock } from "bun:test";

import type { Font } from "../engine/takumi-types-shim.js";
import { clearFontCache, resolveAssetsForLocale } from "./assets-resolver.js";

const stubFont: Font = { name: "test-font", weight: 400 } as Font;

describe("resolveAssetsForLocale", () => {
  beforeEach(() => {
    clearFontCache();
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

  it("does not fetch fonts for non-Arabic locales", async () => {
    const props = { title: "Hello" };
    const fetchFonts = mock((_localeId: string) =>
      Promise.resolve({
        fontFamilies: ["Test"],
        fonts: [stubFont],
      })
    );

    const result = await resolveAssetsForLocale("en", props, { fetchFonts });

    expect(result.fonts).toEqual([]);
    expect(fetchFonts).toHaveBeenCalledTimes(0);
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

  it("memoizes font resolution per locale id", async () => {
    const props = { title: "Hello" };
    const fetchFonts = mock((_localeId: string) =>
      Promise.resolve({
        fontFamilies: ["Test"],
        fonts: [stubFont],
      })
    );

    await resolveAssetsForLocale("ar", props, { fetchFonts });
    await resolveAssetsForLocale("ar", props, { fetchFonts });
    await resolveAssetsForLocale("ar", { other: true }, { fetchFonts });

    expect(fetchFonts).toHaveBeenCalledTimes(1);
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
