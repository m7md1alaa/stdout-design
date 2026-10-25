import type { StudioConfig } from "@stdout-design/core";

type Preset = StudioConfig["presets"][number];
type TemplateEntry = StudioConfig["templates"][string];
type Fonts = NonNullable<StudioConfig["fonts"]>;

export interface Defaults {
  presets: Preset[];
  templates: Record<string, TemplateEntry>;
  defaultPreset?: string;
  fonts?: Fonts;
}

export interface ChangeSummary {
  addedPresets: string[];
  deprecatedPresets: string[];
  addedTemplates: string[];
  addedFontLocales: string[];
  oldVersion: string | null;
  newVersion: string;
}

const mergePresets = (
  existing: StudioConfig,
  defaults: Defaults,
  deprecatedPresetIds: Set<string>
): {
  presets: Preset[];
  addedPresets: string[];
  deprecatedPresets: string[];
} => {
  const existingIds = new Set(existing.presets.map((p) => p.id));
  const addedPresets: string[] = [];

  const presets = [...existing.presets];

  for (const defaultPreset of defaults.presets) {
    if (!existingIds.has(defaultPreset.id)) {
      const marked = deprecatedPresetIds.has(defaultPreset.id)
        ? { ...defaultPreset, deprecated: true }
        : { ...defaultPreset };

      presets.push(marked);
      addedPresets.push(defaultPreset.id);
    }
  }

  const presetsWithDeprecation = presets.map((p) =>
    deprecatedPresetIds.has(p.id) && !p.deprecated
      ? { ...p, deprecated: true }
      : p
  );

  const deprecatedPresets = [
    ...new Set(
      presetsWithDeprecation.filter((p) => p.deprecated).map((p) => p.id)
    ),
  ];

  return { addedPresets, deprecatedPresets, presets: presetsWithDeprecation };
};

const mergeTemplates = (
  existing: StudioConfig,
  defaults: Defaults
): { templates: Record<string, TemplateEntry>; addedTemplates: string[] } => {
  const addedTemplates: string[] = [];
  const templates = { ...existing.templates };

  for (const [key, template] of Object.entries(defaults.templates)) {
    if (!(key in templates)) {
      templates[key] = { ...template };
      addedTemplates.push(key);
    }
  }

  return { addedTemplates, templates };
};

// Adds font entries for locales the project has none for; a locale the
// user already configured is theirs and is left untouched.
const mergeFonts = (
  existing: StudioConfig,
  defaults: Defaults
): { fonts: Fonts | undefined; addedFontLocales: string[] } => {
  const addedFontLocales: string[] = [];
  const fonts: Fonts = { ...existing.fonts };

  for (const [locale, entries] of Object.entries(defaults.fonts ?? {})) {
    if (!(locale in fonts)) {
      fonts[locale] = entries.map((entry) => ({ ...entry }));
      addedFontLocales.push(locale);
    }
  }

  const isEmpty = Object.keys(fonts).length === 0;
  return { addedFontLocales, fonts: isEmpty ? existing.fonts : fonts };
};

const resolveDefaultPreset = (
  presets: Preset[],
  existing: StudioConfig,
  defaults: Defaults
): string | undefined => {
  const mergedIds = new Set(presets.map((p) => p.id));

  const current = existing.defaultPreset;
  if (current && mergedIds.has(current)) {
    return current;
  }

  return defaults.defaultPreset ?? defaults.presets[0]?.id;
};

export const mergeConfig = (
  existing: StudioConfig,
  defaults: Defaults,
  currentVersion: string,
  deprecatedPresetIds: Set<string>
): { config: StudioConfig; summary: ChangeSummary } => {
  const oldVersion = existing.scaffoldVersion ?? null;

  const { presets, addedPresets, deprecatedPresets } = mergePresets(
    existing,
    defaults,
    deprecatedPresetIds
  );

  const { templates, addedTemplates } = mergeTemplates(existing, defaults);
  const { fonts, addedFontLocales } = mergeFonts(existing, defaults);

  const config: StudioConfig = {
    ...existing,
    defaultPreset: resolveDefaultPreset(presets, existing, defaults),
    ...(fonts ? { fonts } : {}),
    presets,
    scaffoldVersion: currentVersion,
    templates,
  };

  const summary: ChangeSummary = {
    addedFontLocales,
    addedPresets,
    addedTemplates,
    deprecatedPresets,
    newVersion: currentVersion,
    oldVersion,
  };

  return { config, summary };
};
