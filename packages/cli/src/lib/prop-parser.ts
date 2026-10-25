import { suggestClosest } from "./suggest.js";

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

const FLAG_PREFIX = "--";

/**
 * Accepts `key=value`, `--key=value` and `--key value` (a bare `--key` with
 * no value is `true`), and normalizes them all to `key=value` / `key`.
 */
export const normalizePropArgs = (args: string[]): string[] => {
  const normalized: string[] = [];

  for (let i = 0; i < args.length; i += 1) {
    const arg = args[i] ?? "";
    if (!arg.startsWith(FLAG_PREFIX)) {
      normalized.push(arg);
      continue;
    }

    const flag = arg.slice(FLAG_PREFIX.length);
    const next = args[i + 1];
    if (
      flag.includes("=") ||
      next === undefined ||
      next.startsWith(FLAG_PREFIX)
    ) {
      normalized.push(flag);
      continue;
    }

    normalized.push(`${flag}=${next}`);
    i += 1;
  }

  return normalized;
};

const assertKnownProp = (key: string, known: string[]): void => {
  if (known.length === 0 || known.includes(key)) {
    return;
  }
  const suggestion = suggestClosest(key, known);
  const hint = suggestion ? ` Did you mean "${suggestion}"?` : "";
  throw new Error(
    `Unknown prop "${key}".${hint} Available props: ${known.join(", ")}`
  );
};

export const parsePropArgs = (
  args: string[],
  schema: JsonSchemaShape
): Record<string, unknown> => {
  const props: Record<string, unknown> = {};
  const properties = schema.properties ?? {};
  const known = Object.keys(properties);

  for (const arg of normalizePropArgs(args)) {
    const eqIndex = arg.indexOf("=");
    if (eqIndex === -1) {
      assertKnownProp(arg, known);
      props[arg] = true;
      continue;
    }

    const key = arg.slice(0, eqIndex);
    const value = arg.slice(eqIndex + 1);
    assertKnownProp(key, known);

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
