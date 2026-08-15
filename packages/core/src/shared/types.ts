import type { z } from "zod";

import type { ImagePolicy } from "../assets/image-resolver.js";

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
  /**
   * Fetch policy for external images/emoji any template's node tree may
   * reference. This is the ONLY place `allowUrl` should be configured --
   * never accept it from request props or template code. Unset denies
   * every URL. See ADR-0018 and `assets/image-resolver.ts`.
   */
  images?: ImagePolicy;
}

export interface TemplateModule {
  default: (props: Record<string, unknown>) => unknown;
  propsSchema: z.ZodObject<Record<string, z.ZodTypeAny>>;
}
