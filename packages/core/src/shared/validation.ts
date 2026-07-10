import { z } from "zod";

/**
 * Single source of truth for the prop-schema type. Previously declared
 * identically in both `props.ts` and `validation.ts` -- consolidated here
 * so there is exactly one place this type can drift from zod's own types.
 */
export type PropSchema = z.ZodObject<Record<string, z.ZodTypeAny>>;

/** Identity helper purely for inference ergonomics at the template definition site. */
export const defineSchema = <T extends PropSchema>(schema: T): T => schema;

export interface PropValidationIssue {
  field: string;
  expected: string;
  received: string;
  message: string;
  code: string;
  suggestion?: string;
}

export class PropValidationError extends Error {
  public readonly issues: PropValidationIssue[];

  constructor(issues: PropValidationIssue[]) {
    super(
      `Invalid props: ${issues.map((i) => `${i.field || "(root)"} - ${i.message}${i.suggestion ? `. Suggestion: ${i.suggestion}` : ""}`).join("; ")}`
    );
    this.name = "PropValidationError";
    this.issues = issues;
  }
}

/**
 * Minimal Zod issue shape — the subset of issue properties we
 * actually consume from ZodError.issues[]. Defined locally to avoid
 * depending on the deprecated z.ZodIssue type.
 */
interface ZodIssueInput {
  code: string;
  message: string;
  path: (string | number)[];
  expected?: string;
  received?: string;
  values?: string[];
  keys?: string[];
  format?: string;
  minimum?: number;
  origin?: string;
}

// --- Public Zod API type guards ---

const isObject = (
  schema: z.ZodTypeAny
): schema is z.ZodObject<Record<string, z.ZodTypeAny>> =>
  schema.type === "object";

const isArray = (schema: z.ZodTypeAny): schema is z.ZodArray<z.ZodTypeAny> =>
  schema.type === "array";

const isEnum = (
  schema: z.ZodTypeAny
): schema is z.ZodEnum<Record<string, string>> => schema.type === "enum";

const isUnion = (
  schema: z.ZodTypeAny
): schema is z.ZodUnion<[z.ZodTypeAny, ...z.ZodTypeAny[]]> =>
  schema.type === "union";

const isZodString = (schema: z.ZodTypeAny): schema is z.ZodString =>
  schema.type === "string";

type Wrappable =
  | z.ZodDefault<z.ZodTypeAny>
  | z.ZodOptional<z.ZodTypeAny>
  | z.ZodNullable<z.ZodTypeAny>;

const isWrappable = (schema: z.ZodTypeAny): schema is Wrappable =>
  schema.type === "default" ||
  schema.type === "optional" ||
  schema.type === "nullable";

// --- Schema path traversal ---

const resolveFieldSchema = (
  schema: z.ZodTypeAny,
  path: (string | number)[]
): z.ZodTypeAny | undefined => {
  let current: z.ZodTypeAny = schema;

  for (let i = 0; i < path.length; i += 1) {
    const segment = path[i] as string | number;
    const isLast = i === path.length - 1;

    if (!isLast && isWrappable(current)) {
      current = current.unwrap();
    }

    if (typeof segment === "number") {
      if (isArray(current)) {
        current = current.element;
        continue;
      }
      return undefined;
    }

    if (isObject(current)) {
      const fieldType = current.shape[segment];
      if (fieldType) {
        current = fieldType;
        continue;
      }
    }

    return undefined;
  }

  return current;
};

// --- Schema description ---

const primitiveLabels: Record<string, string> = {
  any: "any value",
  bigint: "bigint",
  boolean: "boolean",
  date: "date",
  never: "never",
  null: "null",
  number: "number",
  string: "string",
  symbol: "symbol",
  undefined: "undefined",
  unknown: "unknown value",
  void: "void",
};

const describeType = (schema: z.ZodTypeAny): string => {
  const { type } = schema;

  if (isWrappable(schema)) {
    const desc = describeType(schema.unwrap());
    if (type === "optional") {
      return `${desc} (optional)`;
    }
    if (type === "nullable") {
      return `${desc} | null`;
    }
    return desc;
  }

  if (type in primitiveLabels) {
    return primitiveLabels[type] as string;
  }

  if (isObject(schema)) {
    const fields = Object.entries(schema.shape)
      .map(([key, val]) => {
        const inner = isWrappable(val) ? val.unwrap() : val;
        return `${key}: ${describeType(inner)}`;
      })
      .join(", ");
    return `object (${fields})`;
  }

  if (isArray(schema)) {
    return `array of ${describeType(schema.element)}`;
  }

  if (isEnum(schema)) {
    return `one of: ${schema.options.join(", ")}`;
  }

  if (isUnion(schema)) {
    const descs = schema.options.map((o: z.ZodTypeAny) => {
      const inner = isWrappable(o) ? o.unwrap() : o;
      return describeType(inner);
    });
    return `one of: ${descs.join(" | ")}`;
  }

  if (schema.type === "literal") {
    const val = (schema as unknown as { value?: string }).value;
    return JSON.stringify(val ?? "?");
  }

  if (schema.type === "record") {
    return "object (record)";
  }

  if (isZodString(schema)) {
    if (schema.format === "url") {
      return "URL string";
    }
    if (schema.format === "email") {
      return "email string";
    }
    if (schema.format === "uuid") {
      return "UUID string";
    }
    if (schema.minLength !== null) {
      return `string (min ${schema.minLength} characters)`;
    }
    return "string";
  }

  return type;
};

const getObjectShapeKeys = (schema: z.ZodTypeAny): string[] | undefined => {
  const inner = isWrappable(schema) ? schema.unwrap() : schema;
  if (!isObject(inner)) {
    return undefined;
  }
  return Object.keys(inner.shape);
};

// --- Enhanced message handlers ---

const handleInvalidType = (
  issue: ZodIssueInput,
  fieldSchema: z.ZodTypeAny
): string => {
  const received = "received" in issue ? String(issue.received) : "unknown";

  if (isWrappable(fieldSchema)) {
    const inner = fieldSchema.unwrap();
    return `expected ${describeType(inner)} but received ${received} — this field has a default value configured, ensure props are merged correctly before validation`;
  }

  if (
    isObject(fieldSchema) ||
    (isWrappable(fieldSchema) && isObject(fieldSchema.unwrap()))
  ) {
    const keys = getObjectShapeKeys(fieldSchema);
    const keyDesc = keys ? ` with properties (${keys.join(", ")})` : "";
    return `expected object${keyDesc} but received ${received} — add .default({}) to make this field optional`;
  }

  if (isArray(fieldSchema)) {
    return `expected ${describeType(fieldSchema)} but received ${received} — add .default([]) to make this field optional`;
  }

  return issue.message;
};

const handleInvalidFormat = (issue: ZodIssueInput, field: string): string => {
  const { format: fmt } = issue;
  if (fmt === "url") {
    return `invalid URL format for field '${field}' — expected a valid URL (e.g., https://example.com/image.png)`;
  }
  if (fmt === "email") {
    return `invalid email format for field '${field}' — expected a valid email address`;
  }
  return issue.message;
};

const handleInvalidValue = (issue: ZodIssueInput): string => {
  const { values } = issue;
  return `expected one of: ${values?.join(", ") ?? "unknown"}`;
};

const handleTooSmall = (issue: ZodIssueInput): string => {
  const { minimum: min, origin } = issue;
  if (min !== null) {
    let suffix = "";
    if (origin === "string") {
      suffix = "character(s)";
    } else if (origin === "array") {
      suffix = "item(s)";
    }
    return `must be at least ${min} ${suffix}`;
  }
  return issue.message;
};

// --- Message enhancement ---

const enhanceMessage = (
  issue: ZodIssueInput,
  fieldSchema: z.ZodTypeAny | undefined
): string => {
  const field = issue.path.join(".");

  if (!fieldSchema) {
    return issue.message;
  }

  switch (issue.code) {
    case "invalid_type": {
      return handleInvalidType(issue, fieldSchema);
    }
    case "invalid_format": {
      return handleInvalidFormat(issue, field);
    }
    case "invalid_value": {
      return handleInvalidValue(issue);
    }
    case "too_small": {
      return handleTooSmall(issue);
    }
    case "too_big": {
      return issue.message;
    }
    case "unrecognized_keys": {
      const { keys } = issue;
      const keyList = keys?.join(", ") ?? field;
      return `unexpected field '${keyList}' — not recognized by the schema, check for typos or remove it`;
    }
    case "invalid_union": {
      const inner = isWrappable(fieldSchema)
        ? fieldSchema.unwrap()
        : fieldSchema;
      if (isUnion(inner)) {
        return `did not match any valid type — expected ${describeType(inner)}`;
      }
      return issue.message;
    }
    default: {
      return issue.message;
    }
  }
};

const getSuggestion = (
  issue: ZodIssueInput,
  fieldSchema: z.ZodTypeAny | undefined
): string | undefined => {
  if (!fieldSchema) {
    return undefined;
  }

  if (issue.code === "invalid_type") {
    if (isObject(fieldSchema)) {
      return "add .default({}) to make this object optional";
    }
    if (isArray(fieldSchema)) {
      return "add .default([]) to make this array optional";
    }
    if (isWrappable(fieldSchema)) {
      return "ensure props are merged correctly before validation";
    }
  }

  if (issue.code === "invalid_value") {
    const { values } = issue;
    if (values) {
      return `use one of: ${values.join(", ")}`;
    }
  }

  if (issue.code === "invalid_format") {
    const { format: fmt } = issue;
    if (fmt === "url") {
      return "provide a valid URL starting with http:// or https://";
    }
    if (fmt === "email") {
      return "provide a valid email address";
    }
  }

  return undefined;
};

/**
 * Validates props against a template's zod schema, reshaping any failure
 * into a structured, agent-consumable error rather than letting a raw
 * ZodError (verbose, deeply nested, not designed for programmatic
 * consumption) escape to CLI/HTTP/MCP callers.
 *
 * This is the ONLY validation entry point in the package -- it is the
 * function `index.ts` re-exports at the package root, and every downstream
 * consumer (CLI exit-code reporting, MCP "error strings returned to LLM",
 * dev-server field-level error boundaries) is expected to catch
 * `PropValidationError` and read `.issues`, not a raw `ZodError`.
 */
export const validateProps = <T extends PropSchema>(
  schema: T,
  props: unknown
): z.infer<T> => {
  const result = schema.safeParse(props);
  if (result.success) {
    return result.data;
  }

  const issues: PropValidationIssue[] = result.error.issues.map((issue) => {
    const path = issue.path as (string | number)[];
    const fieldSchema = resolveFieldSchema(schema, path);
    return {
      code: String(issue.code),
      expected: "expected" in issue ? String(issue.expected) : "unknown",
      field: path.join("."),
      message: enhanceMessage(issue as ZodIssueInput, fieldSchema),
      received: "received" in issue ? String(issue.received) : "unknown",
      suggestion: getSuggestion(issue as ZodIssueInput, fieldSchema),
    };
  });

  throw new PropValidationError(issues);
};

export const isZodObject = (
  schema: unknown
): schema is z.ZodObject<Record<string, z.ZodTypeAny>> => {
  if (typeof schema !== "object" || schema === null) {
    return false;
  }
  return (schema as z.ZodTypeAny).type === "object";
};

export const zodToJsonSchemaShape = (
  schema: z.ZodTypeAny
): Record<string, unknown> => {
  if (typeof schema !== "object" || !schema || !("shape" in schema)) {
    return {};
  }

  return z.toJSONSchema(schema);
};
