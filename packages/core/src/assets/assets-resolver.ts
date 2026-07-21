import { googleFonts } from "@takumi-rs/helpers";

import type { Font, FontDescriptor } from "../engine/takumi-types-shim.js";
import { logDebug } from "../shared/logger.js";

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

const isFontDescriptor = (f: Font): f is FontDescriptor =>
  typeof f === "object" && !(f instanceof Uint8Array);

const defaultFetchFonts = async (
  localeId: string
): Promise<{ fonts: Font[]; fontFamilies: string[] } | null> => {
  try {
    const fonts = await googleFonts([
      { name: "Noto Sans Arabic", weight: [400, 700] },
    ]);
    const fontFamilies = fonts
      .filter(isFontDescriptor)
      .map((f) => String(f.name ?? ""))
      .filter(Boolean);
    logDebug("googleFonts resolved per locale", {
      count: fonts.length,
      localeId,
      names: fonts.filter(isFontDescriptor).map((f) => f.name),
    });
    return { fontFamilies, fonts };
  } catch (error) {
    logDebug("googleFonts failed for locale", {
      error: String(error),
      localeId,
    });
    return null;
  }
};

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

const classifyLocale = (
  localeId: string
): { lang: string | undefined; needsArabic: boolean } => {
  const isArabic = localeId.startsWith("ar");
  return {
    lang: isArabic ? "ar" : undefined,
    needsArabic: isArabic,
  };
};

const fontCache = new Map<string, Promise<FontResolutionResult | null>>();

export const clearFontCache = (): void => {
  fontCache.clear();
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
  const { lang, needsArabic } = classifyLocale(localeId);

  let fonts: Font[] = [];
  let fontFamilies: string[] | undefined;

  if (options?.preResolvedFonts) {
    fonts = options.preResolvedFonts;
    fontFamilies = options.preResolvedFontFamilies;
  } else if (needsArabic) {
    const fetch = options?.fetchFonts ?? defaultFetchFonts;
    const cached = fontCache.get(localeId);
    let resolution: FontResolutionResult | null;
    if (cached) {
      resolution = await cached;
    } else {
      const promise = fetch(localeId);
      fontCache.set(localeId, promise);
      resolution = await promise;
    }

    if (resolution) {
      ({ fontFamilies, fonts } = resolution);
    }
  }

  return { fontFamilies, fonts, lang, props: mergedProps };
};
