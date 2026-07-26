import type { z } from "zod";

export interface FontConfig {
  family: string;
  weights?: number[];
  source?: "google" | "local";
  path?: string;
}

interface TemplateEntry {
  componentPath: string;
  description?: string;
}

export interface Preset {
  id: string;
  width: number;
  height: number;
  platform: string;
  deprecated?: boolean;
}

export interface StudioConfig {
  templates: Record<string, TemplateEntry>;
  presets: Preset[];
  defaultPreset?: string;
  locales?: string[];
  outDir?: string;
  scaffoldVersion?: string;
  fonts?: Record<string, FontConfig[]>;
}

export interface TemplateModule {
  default: (props: Record<string, unknown>) => unknown;
  propsSchema: z.ZodObject<Record<string, z.ZodTypeAny>>;
}
