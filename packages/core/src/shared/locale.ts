/**
 * The one place a locale id becomes a script and a text direction
 * (ADR-0019). Font fallback, the renderer's `lang`, the render context, and
 * the studio's locale list all read `classifyLocale` instead of testing
 * for `"ar"` themselves.
 */

export const SCRIPTS = ["latin", "arabic", "hebrew"] as const;

export type Script = (typeof SCRIPTS)[number];

export type Direction = "ltr" | "rtl";

const SCRIPT_DIRECTION: Record<Script, Direction> = {
  arabic: "rtl",
  hebrew: "rtl",
  latin: "ltr",
};

/** ISO 15924 script subtags, for ids that name their script (`az-Arab`, `ku-Latn`). */
const SCRIPT_SUBTAG: Readonly<Record<string, Script>> = {
  Arab: "arabic",
  Hebr: "hebrew",
  Latn: "latin",
};

/**
 * Languages whose usual script isn't Latin. Every language not listed here
 * is treated as Latin, which is right for the Latin-script languages and
 * the safe default (left-to-right, the config's default fonts) for the rest.
 */
const LANGUAGE_SCRIPT: Readonly<Record<string, Script>> = {
  ar: "arabic",
  ckb: "arabic",
  fa: "arabic",
  he: "hebrew",
  ps: "arabic",
  sd: "arabic",
  ug: "arabic",
  ur: "arabic",
  yi: "hebrew",
};

export interface LocaleInfo {
  /** The locale id as configured (`"ar"`, `"en-GB"`), or `"default"` for a render without one. */
  id: string;
  script: Script;
  dir: Direction;
  /**
   * BCP 47 language the renderer shapes text with. Set only for non-Latin
   * scripts, whose shaping depends on it; Latin text renders the same
   * without one.
   */
  lang: string | undefined;
}

const DEFAULT_LOCALE = "default";

const parseLocale = (
  id: string
): { language: string; scriptSubtag: string | undefined } | undefined => {
  try {
    const locale = new Intl.Locale(id);
    return { language: locale.language, scriptSubtag: locale.script };
  } catch {
    return undefined;
  }
};

export const classifyLocale = (id: string | undefined): LocaleInfo => {
  const localeId = id ?? DEFAULT_LOCALE;
  const parsed =
    localeId === DEFAULT_LOCALE ? undefined : parseLocale(localeId);
  if (!parsed) {
    return { dir: "ltr", id: localeId, lang: undefined, script: "latin" };
  }
  const script =
    (parsed.scriptSubtag ? SCRIPT_SUBTAG[parsed.scriptSubtag] : undefined) ??
    LANGUAGE_SCRIPT[parsed.language] ??
    "latin";
  return {
    dir: SCRIPT_DIRECTION[script],
    id: localeId,
    lang: script === "latin" ? undefined : parsed.language,
    script,
  };
};
