import type { FontConfig } from "../shared/types.js";

/**
 * The writing systems the renderer distinguishes. Adding one means adding
 * its built-in fonts below; the compiler enforces it.
 */
export type Script = "arabic" | "latin";

/** The one place a locale id is mapped to its script. */
export const scriptOf = (localeId: string): Script =>
  localeId.startsWith("ar") ? "arabic" : "latin";

/** What a locale renders with when the config gives it nothing. */
export const BUILT_IN_FONTS: Record<Script, FontConfig[]> = {
  arabic: [
    { family: "Noto Sans Arabic", source: "google", weights: [400, 700] },
  ],
  latin: [],
};

/**
 * The fonts a locale renders with: its own config entry, else `default`,
 * else the built-in fonts for its script. Arabic locales skip `default`: a
 * Latin display face has no Arabic glyphs, so they keep the built-in Arabic
 * face unless the config declares fonts for them. `default` is also the id
 * of a render with no locale.
 */
export const fontEntriesFor = (
  fonts: Record<string, FontConfig[]> | undefined,
  localeId: string
): FontConfig[] => {
  const script = scriptOf(localeId);
  const configured =
    fonts?.[localeId] ?? (script === "latin" ? fonts?.default : undefined);
  return Array.isArray(configured) && configured.length > 0
    ? configured
    : BUILT_IN_FONTS[script];
};

/**
 * Identifies a font set for caching. Locales that resolve to the same
 * entries share one download; order is kept because it is the fallback
 * order. Local paths resolve against `configDir`, so it is part of the key.
 */
export const fontSetKey = (entries: FontConfig[], configDir = ""): string =>
  JSON.stringify([
    configDir,
    entries.map((e) => [
      e.source ?? "",
      e.family,
      e.weights ?? [],
      e.path ?? "",
    ]),
  ]);
