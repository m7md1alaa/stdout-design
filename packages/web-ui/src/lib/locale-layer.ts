/**
 * The studio's side of locale layers (ADR-0021). Core resolves a locale's
 * props from three layers: the base values, the locale file, and this
 * locale's overrides; only text the schema marks translatable takes part.
 * The studio renders through core, but it also has to show those values
 * in the inspector and know where an edit goes, so it reads the same
 * `x-field.translatable` flag core publishes in the JSON schema.
 */
import type { ListOp } from "./list-ops";
import { indexAfterMove } from "./list-ops";
import { getNestedValue, setNestedValue } from "./template-props";

/** Translatable text keyed by dotted prop path, as core's `TranslationPaths`. */
export type TranslationPaths = Record<string, string>;

type Schema = Record<string, unknown>;

const FIELD_META_KEY = "x-field";
const INDEX_SEGMENT = /^\d+$/u;

const asSchema = (value: unknown): Schema | undefined =>
  typeof value === "object" && value !== null ? (value as Schema) : undefined;

/** The schema of the prop a dotted path names; numeric segments step into list items. */
const schemaAtPath = (schema: Schema, path: string): Schema | undefined => {
  let node: Schema | undefined = schema;
  for (const segment of path.split(".")) {
    if (!node) {
      return undefined;
    }
    node = INDEX_SEGMENT.test(segment)
      ? asSchema(node.items)
      : asSchema(asSchema(node.properties)?.[segment]);
  }
  return node;
};

const usesFieldMeta = (schema: Schema): boolean =>
  Object.values(asSchema(schema.properties) ?? {}).some(
    (prop) => asSchema(prop)?.[FIELD_META_KEY] !== undefined
  );

/**
 * Whether a locale may replace the value at `path`: text marked
 * translatable, at any depth. A schema written without `field.*` keeps
 * core's legacy rule, top-level strings.
 */
export const isTranslatablePath = (schema: Schema, path: string): boolean => {
  const node = schemaAtPath(schema, path);
  if (!node) {
    return false;
  }
  const meta = asSchema(node[FIELD_META_KEY]);
  if (meta) {
    return meta.kind === "text" && meta.translatable === true;
  }
  return (
    !(usesFieldMeta(schema) || path.includes(".")) && node.type === "string"
  );
};

/**
 * The values the inspector shows for a locale: each path's string replaces
 * the value at that path when it is translatable text that exists. A path
 * past the end of a list is skipped, as in core, so lengths never change.
 */
export const applyTranslationPaths = (
  schema: Schema,
  values: Record<string, unknown>,
  paths: TranslationPaths
): Record<string, unknown> => {
  let result = values;
  for (const [path, text] of Object.entries(paths)) {
    if (
      typeof getNestedValue(result, path) === "string" &&
      isTranslatablePath(schema, path)
    ) {
      result = setNestedValue(result, path, text);
    }
  }
  return result;
};

/** Where an item that was at `index` ends up after `op`; a duplicate lives on at both. */
const indicesAfter = (index: number, op: ListOp): number[] => {
  switch (op.kind) {
    case "insert": {
      return [index >= op.index ? index + 1 : index];
    }
    case "remove": {
      if (index === op.index) {
        return [];
      }
      return [index > op.index ? index - 1 : index];
    }
    case "move": {
      return [indexAfterMove(index, op.from, op.to)];
    }
    case "duplicate": {
      if (index === op.index) {
        return [index, index + 1];
      }
      return [index > op.index ? index + 1 : index];
    }
    default: {
      const exhaustive: never = op;
      return exhaustive;
    }
  }
};

/**
 * Re-keys the paths inside the list at `listPath` after a structural
 * change, so an item's per-locale text follows the item.
 */
export const remapListPaths = (
  paths: TranslationPaths,
  listPath: string,
  op: ListOp
): TranslationPaths => {
  const prefix = `${listPath}.`;
  const result: TranslationPaths = {};
  for (const [path, text] of Object.entries(paths)) {
    const rest = path.startsWith(prefix) ? path.slice(prefix.length) : null;
    const [indexSegment = "", ...tail] = rest?.split(".") ?? [];
    if (rest === null || !INDEX_SEGMENT.test(indexSegment)) {
      result[path] = text;
      continue;
    }
    for (const index of indicesAfter(Number(indexSegment), op)) {
      result[[listPath, index, ...tail].join(".")] = text;
    }
  }
  return result;
};
