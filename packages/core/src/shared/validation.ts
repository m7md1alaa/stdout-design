import type { z } from "zod";

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
}

export class PropValidationError extends Error {
  public readonly issues: PropValidationIssue[];

  constructor(issues: PropValidationIssue[]) {
    super(
      `Invalid props: ${issues.map((i) => `${i.field || "(root)"} - ${i.message}`).join("; ")}`
    );
    this.name = "PropValidationError";
    this.issues = issues;
  }
}

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

  const issues: PropValidationIssue[] = result.error.issues.map((issue) => ({
    expected: "expected" in issue ? String(issue.expected) : "unknown",
    field: issue.path.join("."),
    message: issue.message,
    received: "received" in issue ? String(issue.received) : "unknown",
  }));

  throw new PropValidationError(issues);
};
