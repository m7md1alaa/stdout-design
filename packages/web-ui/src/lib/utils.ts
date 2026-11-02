import { clsx } from "clsx";
import type { ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export const cn = (...inputs: ClassValue[]) => twMerge(clsx(inputs));

/** A configured locale as the dev-server describes it (`GET /config` → `localeInfo`). */
export interface LocaleSummary {
  id: string;
  dir: "ltr" | "rtl";
  script: string;
}

/**
 * Scripts the studio can spot in typed text, and the locale to fall back to
 * when the project configures none in that script. Which script a
 * configured locale uses comes from the server, never from its id.
 */
const DETECTABLE_SCRIPTS = [
  { fallbackLocale: "ar", pattern: /[\u0600-\u06FF]/u, script: "arabic" },
  { fallbackLocale: "he", pattern: /[\u0590-\u05FF]/u, script: "hebrew" },
] as const;

const containsText = (value: unknown, pattern: RegExp): boolean => {
  if (typeof value === "string") {
    return pattern.test(value);
  }
  if (Array.isArray(value)) {
    return value.some((item) => containsText(item, pattern));
  }
  if (typeof value === "object" && value !== null) {
    return Object.values(value).some((item) => containsText(item, pattern));
  }
  return false;
};

export const resolveLocale = (
  selectedLocale: string | null,
  propValues: Record<string, unknown>,
  locales: LocaleSummary[]
): { locale: string | null; autoDetected: boolean } => {
  if (selectedLocale !== null) {
    return { autoDetected: false, locale: selectedLocale };
  }
  const detected = DETECTABLE_SCRIPTS.find(({ pattern }) =>
    containsText(propValues, pattern)
  );
  if (detected) {
    return {
      autoDetected: true,
      locale:
        locales.find((locale) => locale.script === detected.script)?.id ??
        detected.fallbackLocale,
    };
  }
  return { autoDetected: false, locale: null };
};
