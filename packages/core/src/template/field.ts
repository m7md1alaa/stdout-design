import { z } from "zod";

import { setFieldMeta } from "../shared/field-meta.js";

/**
 * Prop builders for `defineTemplate`'s schema. Each one records what the
 * field is (see `shared/field-meta.ts`) and carries its whole definition
 * (default, limits, description) as options: chaining `.describe()` or
 * `.min()` onto the result would build a new schema without that record.
 */

interface Described {
  /** Help text shown next to the field in the studio. */
  description?: string;
}

const HEX_COLOR = /^#(?:[\da-f]{3,4}|[\da-f]{6}|[\da-f]{8})$/iu;

const describe = <T extends z.ZodType>(schema: T, description?: string): T =>
  description ? schema.describe(description) : schema;

const text = (
  defaultValue: string,
  options: Described & {
    min?: number;
    max?: number;
    multiline?: boolean;
    /** Locale files may replace it. @default true */
    translatable?: boolean;
  } = {}
) => {
  let schema = z.string();
  if (options.min !== undefined) {
    schema = schema.min(options.min);
  }
  if (options.max !== undefined) {
    schema = schema.max(options.max);
  }
  return setFieldMeta(
    describe(schema, options.description).default(defaultValue),
    {
      kind: "text",
      multiline: options.multiline,
      translatable: options.translatable ?? true,
    }
  );
};

const color = (defaultValue: string, options: Described = {}) =>
  setFieldMeta(
    describe(
      z.string().regex(HEX_COLOR, "expected a hex color like #ff6a3d"),
      options.description
    ).default(defaultValue),
    { kind: "color", translatable: false }
  );

const number = (
  defaultValue: number,
  options: Described & { min?: number; max?: number; integer?: boolean } = {}
) => {
  let schema = options.integer ? z.int() : z.number();
  if (options.min !== undefined) {
    schema = schema.min(options.min);
  }
  if (options.max !== undefined) {
    schema = schema.max(options.max);
  }
  return setFieldMeta(
    describe(schema, options.description).default(defaultValue),
    { kind: "number", translatable: false }
  );
};

const boolean = (defaultValue: boolean, options: Described = {}) =>
  setFieldMeta(
    describe(z.boolean(), options.description).default(defaultValue),
    { kind: "boolean", translatable: false }
  );

const select = <const T extends readonly [string, ...string[]]>(
  values: T,
  defaultValue: T[number],
  options: Described = {}
) =>
  setFieldMeta(
    describe(z.enum(values), options.description).default(defaultValue),
    { kind: "select", translatable: false }
  );

const list = <T extends z.ZodType>(
  item: T,
  options: Described & {
    default: z.input<T>[];
    /** Exact item count; use `min`/`max` for a range. */
    length?: number;
    min?: number;
    max?: number;
  }
) => {
  let schema = z.array(item);
  if (options.length !== undefined) {
    schema = schema.length(options.length);
  }
  if (options.min !== undefined) {
    schema = schema.min(options.min);
  }
  if (options.max !== undefined) {
    schema = schema.max(options.max);
  }
  return setFieldMeta(
    describe(schema, options.description).default(
      options.default as z.output<T>[]
    ),
    { kind: "list", translatable: false }
  );
};

/** A group of fields; every field inside needs a default, so the group defaults to `{}`. */
const object = <T extends z.ZodRawShape>(shape: T, options: Described = {}) =>
  setFieldMeta(
    describe(z.object(shape), options.description).prefault({} as never),
    { kind: "object", translatable: false }
  );

export const field = {
  boolean,
  color,
  list,
  number,
  object,
  select,
  text,
};
