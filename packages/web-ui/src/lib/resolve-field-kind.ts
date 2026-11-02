/**
 * Classifies which prop-field renderer a schema entry needs. A field built
 * with core's `field.*` says what it is under `x-field`; only schemas
 * written without it fall back to the heuristics (color by name, multiline
 * by description length). Pure, so it is testable without mounting a
 * component.
 */
export type FieldKind =
  | { kind: "color" }
  | { kind: "enum"; options: string[] }
  | { kind: "number" }
  | { kind: "boolean" }
  | { kind: "array" }
  | { kind: "text"; multiline: boolean };

/** Mirrors core's `FieldMeta`; the studio reads it from the JSON schema. */
interface FieldMeta {
  kind: string;
  label?: string;
  multiline?: boolean;
}

const FIELD_META_KEY = "x-field";

const readFieldMeta = (
  schema: Record<string, unknown>
): FieldMeta | undefined => {
  const meta = schema[FIELD_META_KEY];
  return typeof meta === "object" && meta !== null && "kind" in meta
    ? (meta as FieldMeta)
    : undefined;
};

/** The name a template gave the field with `field.*({ label })`, if any. */
export const readFieldLabel = (
  schema: Record<string, unknown>
): string | undefined => {
  const { label } = readFieldMeta(schema) ?? {};
  return typeof label === "string" && label.length > 0 ? label : undefined;
};

const enumOptions = (schema: Record<string, unknown>): string[] =>
  Array.isArray(schema.enum) ? schema.enum.map(String) : [];

const fromFieldMeta = (
  meta: FieldMeta,
  schema: Record<string, unknown>
): FieldKind | undefined => {
  switch (meta.kind) {
    case "text": {
      return { kind: "text", multiline: meta.multiline ?? false };
    }
    case "color":
    case "number":
    case "boolean": {
      return { kind: meta.kind };
    }
    case "select": {
      return { kind: "enum", options: enumOptions(schema) };
    }
    case "list": {
      return { kind: "array" };
    }
    default: {
      // A kind from a newer core: classify by shape.
      return undefined;
    }
  }
};

const isColorField = (
  name: string,
  schema: Record<string, unknown>
): boolean => {
  const nameLower = name.toLowerCase();
  return (
    (nameLower.includes("color") || nameLower.includes("colour")) &&
    typeof schema.default === "string" &&
    (schema.default as string).startsWith("#")
  );
};

const LONG_TEXT_THRESHOLD = 60;

const fromShape = (
  name: string,
  schema: Record<string, unknown>
): FieldKind => {
  if (isColorField(name, schema)) {
    return { kind: "color" };
  }

  const { type } = schema;
  const options = enumOptions(schema);

  if (type === "string" && options.length > 0) {
    return { kind: "enum", options };
  }

  if (type === "number" || type === "integer") {
    return { kind: "number" };
  }

  if (type === "boolean") {
    return { kind: "boolean" };
  }

  if (type === "array") {
    return { kind: "array" };
  }

  const description = (schema.description as string) ?? "";
  return { kind: "text", multiline: description.length > LONG_TEXT_THRESHOLD };
};

export const resolveFieldKind = (
  name: string,
  schema: Record<string, unknown>
): FieldKind => {
  const meta = readFieldMeta(schema);
  return (meta && fromFieldMeta(meta, schema)) ?? fromShape(name, schema);
};
