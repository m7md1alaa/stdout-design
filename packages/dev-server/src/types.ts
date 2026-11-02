import { z } from "zod";

/** Per-locale edits by prop path (ADR-0021); applied only with an explicit `locale`. */
const localeOverridesSchema = z.record(z.string(), z.string()).optional();

export const renderRequestSchema = z.object({
  autoDetected: z.boolean().optional().default(false),
  locale: z.string().optional(),
  localeOverrides: localeOverridesSchema,
  preset: z.string().optional(),
  props: z.unknown(),
  templateId: z.string().min(1),
});

export const measureRequestSchema = z.object({
  autoDetected: z.boolean().optional().default(false),
  locale: z.string().optional(),
  localeOverrides: localeOverridesSchema,
  props: z.unknown(),
  templateId: z.string().min(1),
});
