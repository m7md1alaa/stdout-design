import { z } from "zod";

export const renderRequestSchema = z.object({
  autoDetected: z.boolean().optional().default(false),
  locale: z.string().optional(),
  preset: z.string().optional(),
  props: z.unknown(),
  templateId: z.string().min(1),
});

export const measureRequestSchema = z.object({
  autoDetected: z.boolean().optional().default(false),
  locale: z.string().optional(),
  props: z.unknown(),
  templateId: z.string().min(1),
});
