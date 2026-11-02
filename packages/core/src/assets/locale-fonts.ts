import { classifyLocale } from "../shared/locale.js";
import type { Script } from "../shared/locale.js";
import type { FontConfig } from "../shared/types.js";

/**
 * What a script renders with when neither the config nor the template names
 * a face for it. Latin needs none: the renderer's built-in face covers it.
 * Adding a script means adding its entry here; the compiler enforces it.
 */
export const BUILT_IN_FONTS: Record<Script, FontConfig[]> = {
  arabic: [
    { family: "Noto Sans Arabic", source: "google", weights: [400, 700] },
  ],
  hebrew: [
    { family: "Noto Sans Hebrew", source: "google", weights: [400, 700] },
  ],
  latin: [],
};

/**
 * The config's fonts for a locale: its own entry, else `default`. Non-Latin
 * locales skip `default`: a Latin display face has no Arabic or Hebrew
 * glyphs, so they keep the built-in face unless the config declares fonts
 * for them. `default` is also the id of a render with no locale.
 */
export const configuredFontEntries = (
  fonts: Record<string, FontConfig[]> | undefined,
  localeId: string
): FontConfig[] => {
  const isLatin = classifyLocale(localeId).script === "latin";
  const configured =
    fonts?.[localeId] ?? (isLatin ? fonts?.default : undefined);
  return Array.isArray(configured) ? configured : [];
};

/**
 * Identifies a font set for caching. Locales that resolve to the same
 * entries share one download; order is kept because it is the fallback
 * order. Local paths resolve against `configDir`, so it is part of the key.
 */
export const fontSetKey = (
  entries: readonly FontConfig[],
  configDir = ""
): string =>
  JSON.stringify([
    configDir,
    entries.map((e) => [
      e.source ?? "",
      e.family,
      e.weights ?? [],
      e.path ?? "",
    ]),
  ]);
