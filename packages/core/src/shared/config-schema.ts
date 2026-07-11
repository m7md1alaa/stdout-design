import { z } from "zod";

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
  locales: z.array(z.string()).optional(),
  outDir: z.string().optional(),
  presets: z.array(presetSchema),
  templates: z.record(z.string(), templateEntrySchema),
});
