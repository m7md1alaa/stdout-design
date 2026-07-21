import { googleFonts } from "@takumi-rs/helpers";

import type { Font, FontDescriptor } from "../engine/takumi-types-shim.js";
import { logDebug } from "../shared/logger.js";

const isFontDescriptor = (f: Font): f is FontDescriptor =>
  typeof f === "object" && !(f instanceof Uint8Array);

export const defaultFetchFonts = async (
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
