import type { z } from "zod";

import type { Font } from "../engine/takumi-types-shim.js";
import { classifyLocale } from "../shared/locale.js";
import type { Script } from "../shared/locale.js";
import { logWarn } from "../shared/logger.js";
import { applyTranslations } from "../shared/translations.js";
import type { FontConfig } from "../shared/types.js";
import { loadFontConfigs } from "./font-config.js";

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

/**
 * The Google font a script falls back to when the config declares nothing
 * for its locale and the template doesn't name it. Latin needs none: the renderer's built-in face covers it.
 */
const SCRIPT_FALLBACK_FONT: Record<Script, string | undefined> = {
  arabic: "Noto Sans Arabic",
  hebrew: "Noto Sans Hebrew",
  latin: undefined,
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

const FALLBACK_WEIGHTS = [400, 700];

const fontSetKey = (configs: readonly FontConfig[]): string =>
  configs
    .map((c) => `${c.family}@${(c.weights ?? []).join(",")}`)
    .toSorted()
    .join("|");

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
 * to define: a local file wins over Google), then the script's Noto face
 * when the config has nothing for a non-Latin locale.
 */
const resolveFonts = async (
  localeId: string,
  script: Script,
  options: AssetsResolverOptions | undefined
): Promise<FontResolutionResult | null> => {
  const configured = options?.fetchFonts
    ? await cachedFetch(
        `config:${localeId}`,
        () => options.fetchFonts?.(localeId) ?? Promise.resolve(null)
      )
    : null;

  const configuredFamilies = new Set(configured?.fontFamilies);
  const declared = (options?.declaredFonts ?? []).filter(
    (c) => !configuredFamilies.has(c.family)
  );
  const declaredResolution =
    declared.length > 0
      ? await cachedFetch(`declared:${fontSetKey(declared)}`, () =>
          loadFontConfigs(declared, "template")
        )
      : null;
  if (declared.length > 0 && !declaredResolution) {
    logWarn(
      `Template fonts failed to load (${declared.map((c) => c.family).join(", ")}); rendering with fallbacks.`
    );
  }

  const fallbackFamily = SCRIPT_FALLBACK_FONT[script];
  const needsFallback =
    !configured &&
    fallbackFamily !== undefined &&
    !declared.some((c) => c.family === fallbackFamily);
  const fallback = needsFallback
    ? await cachedFetch(`fallback:${fallbackFamily}`, () =>
        loadFontConfigs(
          [
            {
              family: fallbackFamily,
              source: "google",
              weights: FALLBACK_WEIGHTS,
            },
          ],
          `fallback:${localeId}`
        )
      )
    : null;

  return combine([configured, declaredResolution, fallback]);
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
