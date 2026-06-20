export interface TemplateEntry {
  componentPath: string;
  description?: string;
}

export interface Preset {
  id: string;
  width: number;
  height: number;
  platform: string;
}

export interface StudioConfig {
  templates: Record<string, TemplateEntry>;
  presets: Preset[];
  defaultPreset?: string;
  locales?: string[];
  outDir?: string;
}
