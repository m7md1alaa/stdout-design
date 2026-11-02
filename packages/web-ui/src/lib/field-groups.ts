import { resolveFieldKind } from "./resolve-field-kind";
import type { FlattenedProp } from "./template-props";

export interface FieldGroup {
  title: string;
  fields: FlattenedProp[];
}

const GROUP_ORDER = ["Text", "Colors", "Settings", "Lists"] as const;

const groupTitle = (field: FlattenedProp): (typeof GROUP_ORDER)[number] => {
  switch (resolveFieldKind(field.name, field.schema).kind) {
    case "text": {
      return "Text";
    }
    case "color": {
      return "Colors";
    }
    case "array": {
      return "Lists";
    }
    default: {
      return "Settings";
    }
  }
};

/**
 * Groups fields by what they are (text, colors, settings, lists), keeping
 * the schema's order inside each group. The fallback for a template that
 * does not declare its own inspector layout.
 */
export const groupFieldsByKind = (fields: FlattenedProp[]): FieldGroup[] =>
  GROUP_ORDER.map((title) => ({
    fields: fields.filter((field) => groupTitle(field) === title),
    title,
  })).filter((group) => group.fields.length > 0);

const OTHER_TITLE = "Other";

const topKey = (field: FlattenedProp): string => field.path.split(".")[0] ?? "";

/**
 * Groups fields the way the template's `inspector` list says: its groups in
 * its order, each holding the fields under those top-level keys. Fields the
 * list omits go to a trailing "Other" group. Without a list, groups by kind.
 */
export const groupFields = (
  fields: FlattenedProp[],
  inspector?: readonly (readonly [string, readonly string[]])[]
): FieldGroup[] => {
  if (!inspector || inspector.length === 0) {
    return groupFieldsByKind(fields);
  }

  const placed = new Set<string>();
  const groups: FieldGroup[] = inspector.map(([title, keys]) => {
    const inGroup = keys.flatMap((key) =>
      fields.filter((field) => topKey(field) === key)
    );
    for (const key of keys) {
      placed.add(key);
    }
    return { fields: inGroup, title };
  });

  const rest = fields.filter((field) => !placed.has(topKey(field)));
  if (rest.length > 0) {
    groups.push({ fields: rest, title: OTHER_TITLE });
  }
  return groups.filter((group) => group.fields.length > 0);
};
