import { googleFonts } from "@takumi-rs/helpers";

import type { Font, FontDescriptor } from "../engine/takumi-types-shim.js";
import { logDebug } from "../shared/logger.js";
import type { FontConfig } from "../shared/types.js";
import type { FontResolutionResult } from "./assets-resolver.js";

const isFontObject = (f: Font): f is FontDescriptor =>
  typeof f === "object" && !(f instanceof Uint8Array);

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
      const families = configs.map((c) => ({
        name: c.family,
        weight: (c.weights ?? [400, 700]) as number[],
      }));

      const fonts = await googleFonts(families);

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
