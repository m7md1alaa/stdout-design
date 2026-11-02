import { parseHex } from "./color";
import { resolveFieldKind } from "./resolve-field-kind";
import { getNestedValue } from "./template-props";
import type { FlattenedProp } from "./template-props";

/** The distinct colors currently set on a template's color fields, in field order. */
export const collectUsedColors = (
  fields: readonly FlattenedProp[],
  values: Record<string, unknown>
): string[] => {
  const colors = new Set<string>();
  for (const field of fields) {
    if (resolveFieldKind(field.name, field.schema).kind !== "color") {
      continue;
    }
    const value = getNestedValue(values, field.path);
    if (typeof value === "string" && parseHex(value)) {
      colors.add(value.toLowerCase());
    }
  }
  return [...colors];
};
