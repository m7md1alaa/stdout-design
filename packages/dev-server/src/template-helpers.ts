import type { z } from "zod";

import type { TemplateModule } from "./template-loader.js";

// eslint-disable-next-line func-style
export function isZodObject(
  schema: unknown
): schema is z.ZodObject<Record<string, z.ZodTypeAny>> {
  return (
    typeof schema === "object" &&
    schema !== null &&
    "shape" in schema &&
    typeof (schema as Record<string, unknown>).shape === "object" &&
    "parse" in schema &&
    typeof (schema as Record<string, unknown>).parse === "function"
  );
}

// eslint-disable-next-line func-style
export function validateTemplateModule(
  mod: unknown,
  templateId: string
): TemplateModule {
  const candidate = mod as Partial<TemplateModule> | null | undefined;

  if (!candidate || typeof candidate.default !== "function") {
    throw new Error(
      `Template "${templateId}" must have a default export that is a component function.`
    );
  }

  if (!isZodObject(candidate.propsSchema)) {
    throw new Error(
      `Template "${templateId}" must export a "propsSchema" that is a z.object({...}) describing its props.`
    );
  }

  return candidate as TemplateModule;
}

// eslint-disable-next-line func-style
export function summarizeZodIssues(issues: z.ZodIssue[]): string {
  return issues
    .map((issue) => `${issue.path.join(".") || "(root)"}: ${issue.message}`)
    .join("; ");
}

/**
 * Converts a ZodObject schema to a JSON-Schema-shaped representation for
 * transport to the web UI (prop panel) and MCP clients.
 */
// eslint-disable-next-line func-style
export function zodToJsonSchemaShape(
  schema: z.ZodTypeAny
): Record<string, unknown> {
  if (typeof schema !== "object" || !schema || !("shape" in schema)) {
    return {};
  }

  const zodObject = schema as z.ZodObject<Record<string, z.ZodTypeAny>>;
  const properties: Record<string, Record<string, unknown>> = {};

  for (const [key, field] of Object.entries(zodObject.shape)) {
    const prop: Record<string, unknown> = {};

    const defaultValue = (field._def as { defaultValue?: unknown })
      ?.defaultValue;
    if (defaultValue !== undefined) {
      prop.default = defaultValue;
    }

    if (field.description) {
      prop.description = field.description;
    }

    let base = field as z.ZodTypeAny & { unwrap?: () => z.ZodTypeAny };
    while (
      base.unwrap &&
      (base.type === "default" || base.type === "optional")
    ) {
      base = base.unwrap() as z.ZodTypeAny & { unwrap?: () => z.ZodTypeAny };
    }

    switch (base.type) {
      case "string": {
        prop.type = "string";
        break;
      }
      case "number": {
        prop.type = "number";
        break;
      }
      case "boolean": {
        prop.type = "boolean";
        break;
      }
      case "array": {
        prop.type = "array";
        const element = (base._def as { element?: { type?: string } })?.element;
        if (element) {
          prop.items = { type: element.type ?? "string" };
        }
        break;
      }
      default: {
        prop.type = "string";
      }
    }

    properties[key] = prop;
  }

  return { properties };
}
