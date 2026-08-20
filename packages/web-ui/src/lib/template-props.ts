/**
 * Owns the "dotted path into a Template's propsSchema" concept end to end:
 * reading and writing values at a path, discovering which paths a schema
 * defines, computing each path's schema default, and reconciling persisted
 * values against a schema that may have changed shape since they were saved.
 * Everything downstream (the props panel, studio state, persistence) calls
 * through here rather than re-walking propsSchema itself.
 */

export interface FlattenedProp {
  name: string;
  path: string;
  schema: Record<string, unknown>;
}

interface PropDef {
  type?: string;
  default?: unknown;
  properties?: Record<string, PropDef>;
}

const isPlainObject = (v: unknown): v is Record<string, unknown> =>
  v !== null && typeof v === "object" && !Array.isArray(v);

/** Reads the value at a dotted path (e.g. "title.text") out of a props object. */
export const getNestedValue = (
  obj: Record<string, unknown>,
  path: string
): unknown => {
  const parts = path.split(".");
  let current: unknown = obj;
  for (const part of parts) {
    if (current === null || current === undefined) {
      return undefined;
    }
    current = (current as Record<string, unknown>)[part];
  }
  return current;
};

/** Returns a new props object with `value` set at a dotted path, without mutating `obj`. */
export const setNestedValue = <T extends Record<string, unknown>>(
  obj: T,
  path: string,
  value: unknown
): T => {
  const parts = path.split(".");
  if (parts.length === 1) {
    return { ...obj, [path]: value };
  }

  const [head, ...rest] = parts as [string, ...string[]];
  const nestedValue = setNestedValue(
    (obj[head] as Record<string, unknown>) ?? ({} as Record<string, unknown>),
    rest.join("."),
    value
  );
  return { ...obj, [head]: nestedValue };
};

/**
 * Walks a JSON-schema-shaped propsSchema and lists every leaf path it
 * defines, recursing into nested `object` props so callers get one flat
 * list of fields regardless of nesting. Returns `[]` for a schema with no
 * (or no editable) properties.
 */
export const flattenSchema = (
  schema: Record<string, unknown>,
  prefix = ""
): FlattenedProp[] => {
  const properties =
    "properties" in schema ? (schema.properties as unknown) : undefined;
  if (!properties || typeof properties !== "object") {
    return [];
  }

  const result: FlattenedProp[] = [];
  for (const [key, propSchema] of Object.entries(
    properties as Record<string, unknown>
  )) {
    const typed = propSchema as Record<string, unknown>;
    const path = prefix ? `${prefix}.${key}` : key;

    if (typed.type === "object" && typed.properties) {
      result.push(...flattenSchema(typed, path));
    } else {
      result.push({ name: key, path, schema: typed });
    }
  }
  return result;
};

/**
 * Computes each path's schema default (explicit `default`, else a
 * type-appropriate empty value) — the baseline `mergeWithDefaults` layers
 * persisted values onto.
 */
export const computeDefaultProps = (
  propsSchema: Record<string, unknown> | undefined
): Record<string, unknown> => {
  const defaults: Record<string, unknown> = {};
  const properties = (
    propsSchema as { properties?: Record<string, PropDef> } | undefined
  )?.properties;
  if (!properties) {
    return defaults;
  }

  for (const key of Object.keys(properties)) {
    const prop = properties[key];
    if (!prop) {
      continue;
    }

    if (prop.type === "object" && prop.properties) {
      const nested = computeDefaultProps({ properties: prop.properties });
      if (Object.keys(nested).length > 0) {
        defaults[key] = nested;
      }
    } else if ("default" in prop && prop.default !== undefined) {
      defaults[key] = prop.default;
    } else if (prop.type === "string") {
      defaults[key] = "";
    } else if (prop.type === "number") {
      defaults[key] = 0;
    } else if (prop.type === "boolean") {
      defaults[key] = false;
    } else if (prop.type === "array") {
      defaults[key] = [];
    }
  }
  return defaults;
};

/**
 * Layers persisted prop values onto freshly-computed schema defaults,
 * keeping only keys the current schema still defines. Guards against a
 * template's propsSchema changing between sessions (fields renamed, removed,
 * or retyped) reintroducing stale/invalid values from localStorage or an
 * old shared link.
 */
export const mergeWithDefaults = (
  defaults: Record<string, unknown>,
  persisted: Record<string, unknown> | undefined
): Record<string, unknown> => {
  if (!persisted) {
    return defaults;
  }

  const result: Record<string, unknown> = { ...defaults };
  for (const key of Object.keys(defaults)) {
    const defaultValue = defaults[key];
    const persistedValue = persisted[key];
    if (persistedValue === undefined) {
      continue;
    }

    if (isPlainObject(defaultValue) && isPlainObject(persistedValue)) {
      result[key] = mergeWithDefaults(defaultValue, persistedValue);
    } else if (typeof persistedValue === typeof defaultValue) {
      result[key] = persistedValue;
    }
  }
  return result;
};
