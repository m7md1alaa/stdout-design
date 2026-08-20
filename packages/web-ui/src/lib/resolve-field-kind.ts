/**
 * Classifies which prop-field renderer a schema entry needs. Pure and
 * decoupled from rendering so the classification — including the two
 * heuristics most likely to misfire (color detection by name substring, the
 * long-text threshold) — is testable without mounting a component.
 */
export type FieldKind =
  | { kind: "color" }
  | { kind: "enum"; options: string[] }
  | { kind: "number" }
  | { kind: "boolean" }
  | { kind: "array" }
  | { kind: "text"; multiline: boolean };

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

export const resolveFieldKind = (
  name: string,
  schema: Record<string, unknown>
): FieldKind => {
  if (isColorField(name, schema)) {
    return { kind: "color" };
  }

  const type = schema.type as string;
  const enumValues = schema.enum as string[] | undefined;

  if (type === "string" && enumValues && enumValues.length > 0) {
    return { kind: "enum", options: enumValues };
  }

  if (type === "number") {
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
