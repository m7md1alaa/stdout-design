import { readFile } from "node:fs/promises";
import path from "node:path";

import { googleFonts } from "@takumi-rs/helpers";

import type { Font, FontDescriptor } from "../engine/takumi-types-shim.js";
import { classifyLocale } from "../shared/locale.js";
import { logDebug } from "../shared/logger.js";
import type { FontConfig } from "../shared/types.js";
import type { FontResolutionResult } from "./assets-resolver.js";

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

/**
 * The `default` entry covers every locale without its own entry — and the
 * no-locale render, whose id is `default`. Non-Latin locales are excluded
 * from the fallback: a Latin display face has no Arabic or Hebrew glyphs, so
 * they keep the resolver's Noto face unless they declare fonts explicitly.
 */
const resolveLocaleFontConfigs = (
  fontsConfig: Record<string, FontConfig[]>,
  localeId: string
): FontConfig[] | undefined =>
  fontsConfig[localeId] ??
  (classifyLocale(localeId).script === "latin"
    ? fontsConfig.default
    : undefined);

/**
 * Loads font configs: local files from disk, the rest from Google Fonts.
 * Returns null when nothing loads, so callers can fall back.
 */
export const loadFontConfigs = async (
  configs: readonly FontConfig[],
  label: string,
  configDir?: string
): Promise<FontResolutionResult | null> => {
  if (configs.length === 0) {
    return null;
  }

  try {
    const localConfigs = configs.filter(isLocalConfig);
    const googleConfigs = configs.filter((c) => !isLocalConfig(c));

    const localFonts: Font[] = await Promise.all(
      localConfigs.map((c) =>
        loadLocalFontDescriptor(c.family, c.path, c.weights?.[0], configDir)
      )
    );

    const googleFontDescriptors: Font[] =
      googleConfigs.length > 0
        ? await googleFonts(
            googleConfigs.map((c) => ({
              name: c.family,
              weight: [...(c.weights ?? [400, 700])],
            }))
          )
        : [];

    const fonts = [...localFonts, ...googleFontDescriptors];
    const fontFamilies = fonts
      .filter(isFontObject)
      .map((f) => String(f.name ?? ""))
      .filter(Boolean);

    logDebug("fonts resolved", {
      count: fonts.length,
      label,
      names: fontFamilies,
    });
    return fonts.length > 0 ? { fontFamilies, fonts } : null;
  } catch (error) {
    logDebug("fonts failed to load", { error: String(error), label });
    return null;
  }
};

export const createFetchFontsFromConfig = (
  fontsConfig?: Record<string, FontConfig[]> | undefined,
  configDir?: string
): ((localeId: string) => Promise<FontResolutionResult | null>) | undefined => {
  if (!fontsConfig) {
    return undefined;
  }

  return async function fetchFontsFromConfig(localeId: string) {
    const configs = resolveLocaleFontConfigs(fontsConfig, localeId) ?? [];
    return await loadFontConfigs(configs, `config:${localeId}`, configDir);
  };
};
