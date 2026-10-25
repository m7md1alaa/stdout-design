import type { Font } from "../engine/takumi-types-shim.js";
import { fetchBuiltInFonts } from "./font-config.js";
import { scriptOf } from "./locale-fonts.js";

export interface AssetsForLocale {
  fonts: Font[];
  fontFamilies?: string[];
  lang: string | undefined;
  props: Record<string, unknown>;
}

export interface FontResolutionResult {
  fonts: Font[];
  fontFamilies: string[];
}

export interface AssetsResolverOptions {
  fetchFonts?: (localeId: string) => Promise<FontResolutionResult | null>;
  localeData?: Record<string, unknown>;
  loadLocaleData?: (locale: string) => Promise<Record<string, unknown>>;
  preResolvedFonts?: Font[];
  preResolvedFontFamilies?: string[];
}

const mergeLocaleProps = (
  props: Record<string, unknown>,
  localeData?: Record<string, unknown>
): Record<string, unknown> => {
  if (!localeData) {
    return { ...props };
  }

  const merged = { ...props };
  for (const [key, value] of Object.entries(localeData)) {
    if (Array.isArray(value) && Array.isArray(merged[key])) {
      merged[key] = value;
    } else if (typeof value === "string" && typeof merged[key] === "string") {
      merged[key] = value;
    }
  }

  return merged;
};

export const resolveAssetsForLocale = async (
  localeId: string,
  props: Record<string, unknown>,
  options?: AssetsResolverOptions
): Promise<AssetsForLocale> => {
  let localeData = options?.localeData;
  if (options?.loadLocaleData) {
    try {
      localeData = await options.loadLocaleData(localeId);
    } catch {
      localeData = {};
    }
  }

  const mergedProps = mergeLocaleProps(props, localeData);
  const lang = scriptOf(localeId) === "arabic" ? "ar" : undefined;

  let fonts: Font[] = [];
  let fontFamilies: string[] | undefined;

  if (options?.preResolvedFonts) {
    fonts = options.preResolvedFonts;
    fontFamilies = options.preResolvedFontFamilies;
  } else {
    // Without a `fonts` config, or when its fonts fail to load, a locale
    // still gets its script's built-in fonts (none for Latin).
    const fetchFonts = options?.fetchFonts ?? fetchBuiltInFonts;
    const resolution =
      (await fetchFonts(localeId)) ?? (await fetchBuiltInFonts(localeId));
    if (resolution) {
      ({ fontFamilies, fonts } = resolution);
    }
  }

  return { fontFamilies, fonts, lang, props: mergedProps };
};
