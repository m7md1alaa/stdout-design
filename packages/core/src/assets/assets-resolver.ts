import type { Font } from "../engine/takumi-types-shim.js";
import { classifyLocale } from "./classify-locale.js";
import { mergeLocaleProps } from "./merge-locale-props.js";

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
}

const fontCache = new Map<string, Promise<FontResolutionResult | null>>();

export const resolveAssetsForLocale = async (
  localeId: string,
  props: Record<string, unknown>,
  options?: AssetsResolverOptions
): Promise<AssetsForLocale> => {
  const mergedProps = mergeLocaleProps(props, options?.localeData);
  const { lang, needsArabic } = classifyLocale(localeId);

  let fonts: Font[] = [];
  let fontFamilies: string[] | undefined;

  if (needsArabic && options?.fetchFonts) {
    const cached = fontCache.get(localeId);
    let resolution: FontResolutionResult | null;
    if (cached) {
      resolution = await cached;
    } else {
      const promise = options.fetchFonts(localeId);
      fontCache.set(localeId, promise);
      resolution = await promise;
    }

    if (resolution) {
      ({ fontFamilies, fonts } = resolution);
    }
  }

  return { fontFamilies, fonts, lang, props: mergedProps };
};
