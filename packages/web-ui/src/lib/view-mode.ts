/** What the middle of the studio shows. */
export type ViewMode = "single" | "presets" | "compare";

export const VIEW_MODE_LABELS: Record<ViewMode, string> = {
  compare: "Compare",
  presets: "All sizes",
  single: "Canvas",
};

export const VIEW_MODES = Object.keys(VIEW_MODE_LABELS) as ViewMode[];

/**
 * The locale to show beside the current one: the one the user picked if it
 * is still available and different, else the first other locale.
 */
export const resolveCompareLocale = (
  picked: string | null,
  current: string | null,
  locales: readonly string[]
): string | null => {
  if (picked && picked !== current && locales.includes(picked)) {
    return picked;
  }
  return locales.find((locale) => locale !== current) ?? null;
};
