import { readFile } from "node:fs/promises";
import path from "node:path";

import { googleFonts } from "@takumi-rs/helpers";

import type { Font, FontDescriptor } from "../engine/takumi-types-shim.js";
import { logDebug } from "../shared/logger.js";
import type { FontConfig } from "../shared/types.js";
import type { FontResolutionResult } from "./assets-resolver.js";
import { fontEntriesFor, fontSetKey } from "./locale-fonts.js";

const isFontObject = (f: Font): f is FontDescriptor =>
  typeof f === "object" && !(f instanceof Uint8Array);

const loadLocalFontDescriptor = async (
  family: string,
  filePath: string,
  weight?: number,
  configDir?: string
): Promise<FontDescriptor> => {
  const resolved = configDir
    ? path.resolve(configDir, filePath)
    : path.resolve(filePath);
  const data = await readFile(resolved);
  return { data, name: family, weight: weight ?? 400 };
};

const isLocalConfig = (c: FontConfig): c is FontConfig & { path: string } =>
  c.source === "local" && typeof c.path === "string" && c.path.length > 0;

const loadFontSet = async (
  configs: FontConfig[],
  configDir: string | undefined
): Promise<FontResolutionResult | null> => {
  try {
    const localConfigs = configs.filter(isLocalConfig);
    const googleConfigs = configs.filter((c) => !isLocalConfig(c));

    const localFonts: Font[] = await Promise.all(
      localConfigs.map((c) =>
        loadLocalFontDescriptor(c.family, c.path, c.weights?.[0], configDir)
      )
    );

    let googleFontDescriptors: Font[] = [];

    if (googleConfigs.length > 0) {
      const families = googleConfigs.map((c) => ({
        name: c.family,
        weight: (c.weights ?? [400, 700]) as number[],
      }));

      googleFontDescriptors = await googleFonts(families);
    }

    const fonts = [...localFonts, ...googleFontDescriptors];

    const fontFamilies = fonts
      .filter(isFontObject)
      .map((f) => String(f.name ?? ""))
      .filter(Boolean);

    logDebug("fonts resolved", { count: fonts.length, names: fontFamilies });

    return { fontFamilies, fonts };
  } catch (error) {
    logDebug("fonts failed to load", {
      error: String(error),
      families: configs.map((c) => c.family),
    });
    return null;
  }
};

// Keyed by font set, not locale, so locales sharing fonts download once.
// Failures are dropped so the next render retries.
const fontCache = new Map<string, Promise<FontResolutionResult | null>>();

export const clearFontCache = (): void => {
  fontCache.clear();
};

const loadFontSetCached = async (
  configs: FontConfig[],
  configDir: string | undefined
): Promise<FontResolutionResult | null> => {
  const key = fontSetKey(configs, configDir);
  const cached = fontCache.get(key);
  if (cached) {
    return await cached;
  }
  const promise = loadFontSet(configs, configDir);
  fontCache.set(key, promise);
  const resolution = await promise;
  if (!resolution) {
    fontCache.delete(key);
  }
  return resolution;
};

const fetchFontsFor = async (
  fontsConfig: Record<string, FontConfig[]> | undefined,
  localeId: string,
  configDir?: string
): Promise<FontResolutionResult | null> => {
  // Guards untyped callers (a JS config, a bad request) passing no locale.
  if (typeof localeId !== "string") {
    return null;
  }
  const configs = fontEntriesFor(fontsConfig, localeId);
  return configs.length > 0
    ? await loadFontSetCached(configs, configDir)
    : null;
};

/** The fetcher for a project without a `fonts` config: built-in fonts only. */
export const fetchBuiltInFonts = (
  localeId: string
): Promise<FontResolutionResult | null> => fetchFontsFor(undefined, localeId);

export const createFetchFontsFromConfig = (
  fontsConfig?: Record<string, FontConfig[]> | undefined,
  configDir?: string
): ((localeId: string) => Promise<FontResolutionResult | null>) | undefined => {
  if (!fontsConfig) {
    return undefined;
  }

  return (localeId: string) => fetchFontsFor(fontsConfig, localeId, configDir);
};
