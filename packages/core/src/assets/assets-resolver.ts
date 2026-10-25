import { googleFonts } from "@takumi-rs/helpers";
import type { z } from "zod";

import type { Font, FontDescriptor } from "../engine/takumi-types-shim.js";
import { classifyLocale } from "../shared/locale.js";
import type { Script } from "../shared/locale.js";
import { logDebug } from "../shared/logger.js";
import { applyTranslations } from "../shared/translations.js";

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
  /** The template's prop schema; with `field.*` meta, it decides which props a locale file may replace. */
  propsSchema?: z.ZodType;
}

const isFontDescriptor = (f: Font): f is FontDescriptor =>
  typeof f === "object" && !(f instanceof Uint8Array);

/**
 * The Google font a script falls back to when the config declares nothing
 * for its locale. Latin needs none: the renderer's built-in face covers it.
 */
const SCRIPT_FALLBACK_FONT: Record<Script, string | undefined> = {
  arabic: "Noto Sans Arabic",
  hebrew: "Noto Sans Hebrew",
  latin: undefined,
};

const fetchFallbackFont = async (
  localeId: string,
  family: string
): Promise<{ fonts: Font[]; fontFamilies: string[] } | null> => {
  try {
    const fonts = await googleFonts([{ name: family, weight: [400, 700] }]);
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

const fontCache = new Map<string, Promise<FontResolutionResult | null>>();

const cachedFetch = async (
  key: string,
  fetch: () => Promise<FontResolutionResult | null>
): Promise<FontResolutionResult | null> => {
  const cached = fontCache.get(key);
  if (cached) {
    return await cached;
  }
  const promise = fetch();
  fontCache.set(key, promise);
  const resolution = await promise;
  if (!resolution) {
    fontCache.delete(key);
  }
  return resolution;
};

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

  const mergedProps = applyTranslations(
    options?.propsSchema,
    props,
    localeData
  );
  const { lang, script } = classifyLocale(localeId);
  const fallbackFont = SCRIPT_FALLBACK_FONT[script];

  let fonts: Font[] = [];
  let fontFamilies: string[] | undefined;

  if (options?.preResolvedFonts) {
    fonts = options.preResolvedFonts;
    fontFamilies = options.preResolvedFontFamilies;
  } else {
    // Config fonts apply to every locale; a non-Latin script falls back to
    // its Noto face when the config has nothing for it.
    let resolution = options?.fetchFonts
      ? await cachedFetch(
          `config:${localeId}`,
          () => options.fetchFonts?.(localeId) ?? Promise.resolve(null)
        )
      : null;
    if (!resolution && fallbackFont) {
      resolution = await cachedFetch(`fallback:${localeId}`, () =>
        fetchFallbackFont(localeId, fallbackFont)
      );
    }

    if (resolution) {
      ({ fontFamilies, fonts } = resolution);
    }
  }

  return { fontFamilies, fonts, lang, props: mergedProps };
};
