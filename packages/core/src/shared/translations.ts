import type { z } from "zod";

import { getFieldMeta } from "./field-meta.js";

type Values = Record<string, unknown>;

const WRAPPER_TYPES = new Set([
  "default",
  "prefault",
  "optional",
  "nullable",
  "readonly",
  "catch",
]);

export const isRecord = (value: unknown): value is Values =>
  typeof value === "object" && value !== null && !Array.isArray(value);

/** Peels `.default()`, `.optional()` and the like off to the schema that says what the value is. */
const unwrap = (schema: z.ZodType): z.ZodType => {
  let current = schema;
  while (WRAPPER_TYPES.has(current.type)) {
    current = (current.def as unknown as { innerType: z.ZodType }).innerType;
  }
  return current;
};

export const shapeOf = (
  schema: z.ZodType
): Record<string, z.ZodType> | undefined => {
  const inner = unwrap(schema);
  return inner.type === "object"
    ? (inner as z.ZodObject<Record<string, z.ZodType>>).shape
    : undefined;
};

export const elementOf = (schema: z.ZodType): z.ZodType | undefined => {
  const inner = unwrap(schema);
  return inner.type === "array"
    ? (inner as z.ZodArray<z.ZodType>).element
    : undefined;
};

/** True when anything in the schema was built with `field.*`. */
export const hasFieldMeta = (schema: z.ZodType): boolean => {
  if (getFieldMeta(schema)) {
    return true;
  }
  const shape = shapeOf(schema);
  if (shape) {
    return Object.values(shape).some(hasFieldMeta);
  }
  const element = elementOf(schema);
  return element ? hasFieldMeta(element) : false;
};

const translateValue = (
  schema: z.ZodType,
  value: unknown,
  translation: unknown
): unknown => {
  const meta = getFieldMeta(schema);
  if (meta?.kind === "text") {
    return meta.translatable && typeof translation === "string"
      ? translation
      : value;
  }

  const shape = shapeOf(schema);
  if (shape) {
    if (!(isRecord(value) && isRecord(translation))) {
      return value;
    }
    // oxlint-disable-next-line no-use-before-define -- mutual recursion over nested schemas
    return translateObject(shape, value, translation);
  }

  const element = elementOf(schema);
  if (element && Array.isArray(value) && Array.isArray(translation)) {
    // Item by item: a translation covers the items it lists and never
    // changes how many there are, so the list's length rules still hold.
    return value.map((item, index) =>
      index < translation.length
        ? translateValue(element, item, translation[index])
        : item
    );
  }

  return value;
};

const translateObject = (
  shape: Record<string, z.ZodType>,
  values: Values,
  translations: Values
): Values => {
  const result = { ...values };
  for (const [key, translation] of Object.entries(translations)) {
    const schema = shape[key];
    if (schema && key in values) {
      result[key] = translateValue(schema, values[key], translation);
    }
  }
  return result;
};

/**
 * The pre-`field.*` rule, kept for legacy schemas: a top-level string
 * replaces a string and an array replaces an array.
 */
const translateByValue = (values: Values, translations: Values): Values => {
  const result = { ...values };
  for (const [key, translation] of Object.entries(translations)) {
    const current = result[key];
    const sameShape =
      (typeof translation === "string" && typeof current === "string") ||
      (Array.isArray(translation) && Array.isArray(current));
    if (sameShape) {
      result[key] = translation;
    }
  }
  return result;
};

/**
 * Applies a locale file to validated props. When the schema was built with
 * `field.*`, only text fields marked translatable change, at any depth,
 * including inside lists of objects; colours, numbers, URLs and list
 * lengths never do. Other schemas keep the by-value rule.
 */
export const applyTranslations = (
  schema: z.ZodType | undefined,
  values: Values,
  translations: Values | undefined
): Values => {
  if (!translations) {
    return { ...values };
  }
  const shape = schema ? shapeOf(schema) : undefined;
  if (!(schema && shape && hasFieldMeta(schema))) {
    return translateByValue(values, translations);
  }
  return translateObject(shape, values, translations);
};
