import { readFile } from "node:fs/promises";
import path from "node:path";

import { googleFonts } from "@takumi-rs/helpers";

import type { Font, FontDescriptor } from "../engine/takumi-types-shim.js";
import { logDebug } from "../shared/logger.js";
import type { FontConfig } from "../shared/types.js";
import type { FontResolutionResult } from "./assets-resolver.js";

const isFontObject = (f: Font): f is FontDescriptor =>
  typeof f === "object" && !(f instanceof Uint8Array);

const loadLocalFontDescriptor = async (
  family: string,
  filePath: string,
  weight?: number
): Promise<FontDescriptor> => {
  const data = await readFile(path.resolve(filePath));
  return { data, name: family, weight: weight ?? 400 };
};

const isLocalConfig = (c: FontConfig): c is FontConfig & { path: string } =>
  c.source === "local" && typeof c.path === "string" && c.path.length > 0;

export const createFetchFontsFromConfig = (
  fontsConfig: Record<string, FontConfig[]> | undefined
): ((localeId: string) => Promise<FontResolutionResult | null>) | undefined => {
  if (!fontsConfig) {
    return undefined;
  }

  return async (localeId: string) => {
    const configs = fontsConfig[localeId];
    if (!configs || configs.length === 0) {
      return null;
    }

    try {
      const localConfigs = configs.filter(isLocalConfig);
      const googleConfigs = configs.filter((c) => !isLocalConfig(c));

      const localFonts: Font[] = await Promise.all(
        localConfigs.map((c) =>
          loadLocalFontDescriptor(c.family, c.path, c.weights?.[0])
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

      logDebug("fonts resolved from config", {
        count: fonts.length,
        localeId,
        names: fontFamilies,
      });

      return { fontFamilies, fonts };
    } catch (error) {
      logDebug("fonts from config failed", {
        error: String(error),
        localeId,
      });
      return null;
    }
  };
};
