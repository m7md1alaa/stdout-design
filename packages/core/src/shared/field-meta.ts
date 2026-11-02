import type { z } from "zod";

/**
 * What a template prop is, recorded when `field.*` creates it (ADR-0019),
 * so nothing downstream guesses from the prop's name or value. The studio
 * reads it from the JSON schema (`x-field`); the locale merge reads
 * `translatable` to decide which values a translation may replace.
 */
export const FIELD_KINDS = [
  "text",
  "color",
  "number",
  "boolean",
  "select",
  "list",
  "object",
] as const;

export type FieldKind = (typeof FIELD_KINDS)[number];

export interface FieldMeta {
  kind: FieldKind;
  /** Locale files may replace this value. True for text, false for everything else. */
  translatable: boolean;
  /** Name the studio shows, for keys that do not read well in sentence case. */
  label?: string;
  /** Text fields only: render a multi-line editor. */
  multiline?: boolean;
}

/** JSON-schema key the studio reads a field's meta from. */
export const FIELD_META_KEY = "x-field";

// Keyed on the global symbol registry so two copies of core in one process
// (a template bundled against a different version) still share one table.
const REGISTRY_KEY = Symbol.for("stdout-design.field-meta");
const registry: WeakMap<z.ZodType, FieldMeta> = ((
  globalThis as Record<symbol, unknown>
)[REGISTRY_KEY] ??= new WeakMap()) as WeakMap<z.ZodType, FieldMeta>;

export const setFieldMeta = <T extends z.ZodType>(
  schema: T,
  meta: FieldMeta
): T => {
  registry.set(schema, meta);
  return schema;
};

export const getFieldMeta = (schema: z.ZodType): FieldMeta | undefined =>
  registry.get(schema);
