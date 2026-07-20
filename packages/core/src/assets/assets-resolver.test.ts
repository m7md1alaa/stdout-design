import { describe, expect, it, mock } from "bun:test";

import type { Font } from "../node/takumi-types-shim.js";
import { resolveAssetsForLocale } from "./assets-resolver.js";

const stubFont: Font = { name: "test-font", weight: 400 } as Font;

describe("resolveAssetsForLocale", () => {
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
});
