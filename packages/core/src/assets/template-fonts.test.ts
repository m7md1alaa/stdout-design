import { beforeEach, describe, expect, it, mock } from "bun:test";

const googleFontsMock = mock((families: { name: string }[]) =>
  Promise.resolve(
    families.map(({ name }) => ({ data: new Uint8Array(), name }))
  )
);

mock.module("@takumi-rs/helpers", () => ({ googleFonts: googleFontsMock }));

const { clearFontCache, resolveAssetsForLocale } =
  await import("./assets-resolver.js");

const requested = (): string[] =>
  googleFontsMock.mock.calls.flatMap(([families]) =>
    families.map((family) => family.name)
  );

const configFonts = (families: string[]) => () =>
  Promise.resolve({
    fontFamilies: families,
    fonts: families.map((name) => ({ data: new Uint8Array(), name })),
  });

describe("template-declared fonts", () => {
  beforeEach(() => {
    clearFontCache();
    googleFontsMock.mockClear();
  });

  it("loads every declared face on a Latin render", async () => {
    const result = await resolveAssetsForLocale(
      "en",
      {},
      {
        declaredFonts: [
          { family: "Anton", source: "google", weights: [400] },
          { family: "Inter", source: "google", weights: [400, 800] },
        ],
      }
    );
    expect(result.fontFamilies).toEqual(["Anton", "Inter"]);
  });

  it("adds the script's Noto face when nothing else covers Arabic", async () => {
    const result = await resolveAssetsForLocale(
      "ar",
      {},
      { declaredFonts: [{ family: "Anton", source: "google" }] }
    );
    expect(result.fontFamilies).toEqual(["Anton", "Noto Sans Arabic"]);
  });

  it("skips the fallback when the template names it or the config covers the locale", async () => {
    const named = await resolveAssetsForLocale(
      "ar",
      {},
      { declaredFonts: [{ family: "Noto Sans Arabic", source: "google" }] }
    );
    expect(named.fontFamilies).toEqual(["Noto Sans Arabic"]);

    const configured = await resolveAssetsForLocale(
      "ar",
      {},
      {
        declaredFonts: [{ family: "Anton", source: "google" }],
        fetchFonts: configFonts(["Cairo"]),
      }
    );
    expect(configured.fontFamilies).toEqual(["Cairo", "Anton"]);
  });

  it("lets the config define a family the template also declares", async () => {
    const result = await resolveAssetsForLocale(
      "en",
      {},
      {
        declaredFonts: [
          { family: "Anton", source: "google" },
          { family: "Inter", source: "google" },
        ],
        fetchFonts: configFonts(["Inter"]),
      }
    );
    expect(result.fontFamilies).toEqual(["Inter", "Anton"]);
    expect(requested()).toEqual(["Anton"]);
  });

  it("fetches a declared set once across renders and locales", async () => {
    const declaredFonts = [{ family: "Anton", source: "google" as const }];
    await resolveAssetsForLocale("en", {}, { declaredFonts });
    await resolveAssetsForLocale("fr", {}, { declaredFonts });
    expect(requested()).toEqual(["Anton"]);
  });
});
