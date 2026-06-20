import type { z } from "zod";

export type PropSchema = z.ZodObject<Record<string, z.ZodTypeAny>>;

export const defineSchema = <T extends PropSchema>(schema: T): T => schema;

export const validateProps = <T extends PropSchema>(
  schema: T,
  props: unknown,
): z.infer<T> => schema.parse(props);
