interface PropSchemaField {
  default?: unknown;
  description?: string;
  items?: { type: string };
  type: string;
}

export interface JsonSchemaShape {
  properties: Record<string, PropSchemaField>;
}

const coerceValue = (
  value: string,
  type: string,
  _items?: { type: string }
): unknown => {
  switch (type) {
    case "number": {
      const n = Number(value);
      return Number.isNaN(n) ? value : n;
    }
    case "boolean": {
      if (value === "true" || value === "1") {
        return true;
      }
      if (value === "false" || value === "0") {
        return false;
      }
      return value;
    }
    case "array": {
      if (value.startsWith("[") && value.endsWith("]")) {
        try {
          return JSON.parse(value) as unknown[];
        } catch {
          return value.split(",").map((s) => s.trim());
        }
      }
      return value.split(",").map((s) => s.trim());
    }
    default: {
      return value;
    }
  }
};

export const parsePropArgs = (
  args: string[],
  schema: JsonSchemaShape
): Record<string, unknown> => {
  const props: Record<string, unknown> = {};
  const properties = schema.properties ?? {};

  for (const arg of args) {
    const eqIndex = arg.indexOf("=");
    if (eqIndex === -1) {
      props[arg] = true;
      continue;
    }

    const key = arg.slice(0, eqIndex);
    const value = arg.slice(eqIndex + 1);

    const field = properties[key];
    props[key] = field ? coerceValue(value, field.type, field.items) : value;
  }

  return props;
};

export const mergeDefaultProps = (
  schema: JsonSchemaShape,
  props: Record<string, unknown>
): Record<string, unknown> => {
  const properties = schema.properties ?? {};
  const merged: Record<string, unknown> = {};

  for (const [key, field] of Object.entries(properties)) {
    if (field.default !== undefined) {
      merged[key] = field.default;
    }
  }

  return { ...merged, ...props };
};
