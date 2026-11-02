import type { z } from "zod";

import type { Font } from "../engine/takumi-types-shim.js";
import { classifyLocale } from "../shared/locale.js";
import type { Script } from "../shared/locale.js";
import { logWarn } from "../shared/logger.js";
import { applyTranslations } from "../shared/translations.js";
import type { FontConfig } from "../shared/types.js";
import { loadFontConfigs } from "./font-config.js";
import { BUILT_IN_FONTS } from "./locale-fonts.js";

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
  /** Faces the template declares (`defineTemplate({ fonts })`), loaded on every locale. */
  declaredFonts?: readonly FontConfig[];
  /** The template's prop schema; with `field.*` meta, it decides which props a locale file may replace. */
  propsSchema?: z.ZodType;
}

const combine = (
  parts: (FontResolutionResult | null)[]
): FontResolutionResult | null => {
  const present = parts.filter((part) => part !== null);
  if (present.length === 0) {
    return null;
  }
  return {
    fontFamilies: [...new Set(present.flatMap((part) => part.fontFamilies))],
    fonts: present.flatMap((part) => part.fonts),
  };
};

/**
 * The fonts a render loads: the config's for this locale, then every face
 * the template declares (a family the config already loads is the config's
 * to define: a local file wins over Google), then the script's built-in
 * face when the config has nothing for the locale and the template doesn't
 * name it. Each set is fetched once per process (see `loadFontConfigs`).
 */
const resolveFonts = async (
  localeId: string,
  script: Script,
  options: AssetsResolverOptions | undefined
): Promise<FontResolutionResult | null> => {
  const configured = options?.fetchFonts
    ? await options.fetchFonts(localeId)
    : null;

  const configuredFamilies = new Set(configured?.fontFamilies);
  const declared = (options?.declaredFonts ?? []).filter(
    (c) => !configuredFamilies.has(c.family)
  );
  const declaredResolution = await loadFontConfigs(declared);
  if (declared.length > 0 && !declaredResolution) {
    logWarn(
      `Template fonts failed to load (${declared.map((c) => c.family).join(", ")}); rendering with fallbacks.`
    );
  }

  const builtIn = configured
    ? []
    : BUILT_IN_FONTS[script].filter(
        (c) => !declared.some((d) => d.family === c.family)
      );
  const fallback = await loadFontConfigs(builtIn);

  return combine([configured, declaredResolution, fallback]);
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

  if (options?.preResolvedFonts) {
    return {
      fontFamilies: options.preResolvedFontFamilies,
      fonts: options.preResolvedFonts,
      lang,
      props: mergedProps,
    };
  }

  const resolution = await resolveFonts(localeId, script, options);
  return {
    fontFamilies: resolution?.fontFamilies,
    fonts: resolution?.fonts ?? [],
    lang,
    props: mergedProps,
  };
};
