import { z } from "zod";

export const renderRequestSchema = z.object({
  locale: z.string().optional(),
  preset: z.string().optional(),
  props: z.unknown(),
  templateId: z.string().min(1),
});

type RenderRequest = z.infer<typeof renderRequestSchema>;

export const measureRequestSchema = z.object({
  props: z.unknown(),
  templateId: z.string().min(1),
});

type MeasureRequest = z.infer<typeof measureRequestSchema>;
