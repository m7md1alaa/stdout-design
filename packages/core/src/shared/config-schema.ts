import { z } from "zod";

import type { ImagePolicy } from "../assets/image-resolver.js";
import type { StudioConfig } from "./types.js";

const fontConfigSchema = z.object({
  family: z.string().min(1),
  path: z.string().optional(),
  source: z.enum(["google", "local"]).optional(),
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

/**
 * `studio.config.ts` is loaded via a real `import()` (see
 * `batch/loaders.ts`), not JSON, so it can hold live function values --
 * but a plain `z.object()` silently strips any key it doesn't declare, so
 * `allowUrl`/`fetch` need an explicit (permissive, runtime-checked-only-
 * for-"is it a function") schema entry or they vanish here before
 * `image-resolver.ts` ever sees them. See ADR-0018.
 */
const imagePolicySchema = z.object({
  allowUrl: z
    .custom<ImagePolicy["allowUrl"]>((val) => typeof val === "function")
    .optional(),
  emoji: z
    .custom<ImagePolicy["emoji"]>((val) => typeof val === "string")
    .optional(),
  fetch: z
    .custom<ImagePolicy["fetch"]>((val) => typeof val === "function")
    .optional(),
  maxBytes: z.number().int().positive().optional(),
  timeout: z.number().int().optional(),
});

export const studioConfigSchema = z.object({
  defaultPreset: z.string().optional(),
  fonts: z.record(z.string(), z.array(fontConfigSchema)).optional(),
  images: imagePolicySchema.optional(),
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
