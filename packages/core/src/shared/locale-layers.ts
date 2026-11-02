import type { z } from "zod";

import { getFieldMeta } from "./field-meta.js";
import {
  applyTranslations,
  elementOf,
  hasFieldMeta,
  isRecord,
  shapeOf,
} from "./translations.js";

type Values = Record<string, unknown>;

/**
 * Translatable text keyed by dotted prop path: `title`, `cta.label`,
 * `stats.1.label`, `tags.0`. The flat form of a locale file's entry for one
 * template, and the form the studio stores per-locale edits in, so the two
 * layers can be listed, compared, reset one field at a time, and written
 * back to a locale file.
 */
export type TranslationPaths = Record<string, string>;

/** The layers a locale's props resolve from. Later layers win. */
export interface LocaleLayers {
  /** The locale file's entry for the template (`locales/ar.json` → `{ "launch-hero": … }`). */
  translations?: Values;
  /** Edits made for this locale only, e.g. in the studio. */
  overrides?: TranslationPaths;
}

const INDEX_SEGMENT = /^\d+$/u;
// A path comes from a request body; these would reach Object.prototype.
const UNSAFE_SEGMENTS = new Set(["__proto__", "constructor", "prototype"]);

type Container = Values | unknown[];

const childFor = (nextSegment: string): Container =>
  INDEX_SEGMENT.test(nextSegment) ? [] : {};

const setPath = (root: Values, segments: string[], value: string): void => {
  let node: Container = root;
  for (const [i, segment] of segments.entries()) {
    const slots = node as Record<string, unknown>;
    const next = segments[i + 1];
    if (next === undefined) {
      slots[segment] = value;
      return;
    }
    const existing = slots[segment];
    if (existing !== undefined && typeof existing !== "object") {
      // `title` already holds a string; `title.x` has nowhere to go.
      return;
    }
    const child = (existing as Container | undefined) ?? childFor(next);
    slots[segment] = child;
    node = child;
  }
};

/** Holes in a sparse list become `null`: "no translation for this item". */
const fillHoles = (value: unknown): unknown => {
  if (Array.isArray(value)) {
    return Array.from(value, (item) =>
      item === undefined ? null : fillHoles(item)
    );
  }
  if (isRecord(value)) {
    return Object.fromEntries(
      Object.entries(value).map(([key, item]) => [key, fillHoles(item)])
    );
  }
  return value;
};

/**
 * Turns flat paths back into the nested shape a locale file has, so they
 * go through the same merge. A list item a path doesn't name is `null`,
 * which the merge treats as "keep the base value".
 */
export const translationsFromPaths = (paths: TranslationPaths): Values => {
  const root: Values = {};
  for (const [path, value] of Object.entries(paths)) {
    const segments = path.split(".");
    const usable = segments.every(
      (segment) => segment.length > 0 && !UNSAFE_SEGMENTS.has(segment)
    );
    if (usable && typeof value === "string") {
      setPath(root, segments, value);
    }
  }
  return fillHoles(root) as Values;
};

const join = (prefix: string, key: string | number): string =>
  prefix ? `${prefix}.${key}` : String(key);

const flattenValue = (
  schema: z.ZodType,
  translation: unknown,
  path: string,
  out: TranslationPaths
): void => {
  const meta = getFieldMeta(schema);
  if (meta?.kind === "text") {
    if (meta.translatable && typeof translation === "string") {
      out[path] = translation;
    }
    return;
  }

  const shape = shapeOf(schema);
  if (shape) {
    if (isRecord(translation)) {
      for (const [key, value] of Object.entries(translation)) {
        const child = shape[key];
        if (child) {
          flattenValue(child, value, join(path, key), out);
        }
      }
    }
    return;
  }

  const element = elementOf(schema);
  if (element && Array.isArray(translation)) {
    for (const [index, item] of translation.entries()) {
      flattenValue(element, item, join(path, index), out);
    }
  }
};

/**
 * Lists the translatable strings a locale file sets for one template, by
 * path. Only text the schema marks translatable is listed, the same values
 * `applyTranslations` would let the file replace. A schema without
 * `field.*` meta keeps the legacy rule: top-level strings.
 */
export const flattenTranslations = (
  schema: z.ZodType | undefined,
  translations: Values | undefined
): TranslationPaths => {
  const out: TranslationPaths = {};
  if (!translations) {
    return out;
  }
  const shape = schema ? shapeOf(schema) : undefined;
  if (schema && shape && hasFieldMeta(schema)) {
    flattenValue(schema, translations, "", out);
    return out;
  }
  for (const [key, value] of Object.entries(translations)) {
    if (typeof value === "string" && (!shape || key in shape)) {
      out[key] = value;
    }
  }
  return out;
};

/**
 * A template's props for one locale: the base values, then the locale
 * file, then this locale's overrides. The file and the overrides only
 * replace translatable text, through the same rule (`applyTranslations`),
 * so colours, numbers, URLs and list lengths always come from the base
 * values. See ADR-0021.
 */
export const resolveLocaleLayers = (
  schema: z.ZodType | undefined,
  base: Values,
  { translations, overrides }: LocaleLayers
): Values => {
  const withFile = applyTranslations(schema, base, translations);
  if (!overrides || Object.keys(overrides).length === 0) {
    return withFile;
  }
  const layered = Boolean(schema && shapeOf(schema) && hasFieldMeta(schema));
  // The legacy rule replaces whole top-level values, so only top-level paths
  // can be overridden without a list of nulls replacing a real list.
  const usable = layered
    ? overrides
    : Object.fromEntries(
        Object.entries(overrides).filter(([path]) => !path.includes("."))
      );
  return applyTranslations(schema, withFile, translationsFromPaths(usable));
};
