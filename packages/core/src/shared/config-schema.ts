import { z } from "zod";

import type { StudioConfig } from "./types.js";

const fontConfigSchema = z.object({
  family: z.string().min(1),
  weights: z.array(z.number().int().positive()).optional(),
});

const templateEntrySchema = z.object({
  componentPath: z.string().min(1, "componentPath is required"),
  description: z.string().optional(),
});

const presetSchema = z.object({
  height: z.number().int().positive(),
  id: z.string().min(1),
  platform: z.string().min(1),
  width: z.number().int().positive(),
});

export const studioConfigSchema = z.object({
  defaultPreset: z.string().optional(),
  fonts: z.record(z.string(), z.array(fontConfigSchema)).optional(),
  locales: z.array(z.string()).optional(),
  outDir: z.string().optional(),
  presets: z.array(presetSchema),
  scaffoldVersion: z.string().optional(),
  templates: z.record(z.string(), templateEntrySchema),
});

export const parseStudioConfig = (
  raw: unknown
): { config: StudioConfig } | { issues: string } => {
  const parsed = studioConfigSchema.safeParse(raw);
  if (!parsed.success) {
    const issues = parsed.error.issues
      .map((issue) => `${issue.path.join(".") || "(root)"}: ${issue.message}`)
      .join("; ");
    return { issues };
  }
  return { config: parsed.data };
};
