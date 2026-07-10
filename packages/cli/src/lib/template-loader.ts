import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { pathToFileURL } from "node:url";

import { ErrorCode, AppError, logDebug } from "@stdout-design/core";

export interface TemplateModule {
  default: (props: Record<string, unknown>) => unknown;
  propsSchema: Record<string, unknown>;
}

export interface LoadedTemplate {
  module: TemplateModule;
  contentHash: string;
}

const isZodObject = (schema: unknown): schema is Record<string, unknown> =>
  typeof schema === "object" &&
  schema !== null &&
  "shape" in schema &&
  typeof (schema as Record<string, unknown>).shape === "object" &&
  "parse" in schema &&
  typeof (schema as Record<string, unknown>).parse === "function";

export const loadTemplate = async (
  rootDir: string,
  componentPath: string,
  templateId: string
): Promise<LoadedTemplate> => {
  const fullPath = path.resolve(rootDir, `${componentPath}.tsx`);

  let content: string;
  try {
    content = await readFile(fullPath, "utf-8");
  } catch {
    throw new AppError(
      ErrorCode.TEMPLATE_LOAD_FAILED,
      `Template file not found: ${fullPath}`,
      { componentPath, templateId }
    );
  }

  const contentHash = createHash("sha256")
    .update(content)
    .digest("hex")
    .slice(0, 16);

  logDebug("Loading template", { path: fullPath, templateId });

  const mod = await import(pathToFileURL(fullPath).href);
  const defaultExport = (mod as Record<string, unknown>).default;

  if (typeof defaultExport !== "function") {
    throw new AppError(
      ErrorCode.TEMPLATE_INVALID_EXPORT,
      `Template "${templateId}" must have a default export that is a component function.`,
      { templateId }
    );
  }

  const { propsSchema } = mod as Record<string, unknown>;
  if (!isZodObject(propsSchema)) {
    throw new AppError(
      ErrorCode.TEMPLATE_INVALID_EXPORT,
      `Template "${templateId}" must export a "propsSchema" that is a z.object({...}).`,
      { templateId }
    );
  }

  return {
    contentHash,
    module: {
      default: defaultExport as TemplateModule["default"],
      propsSchema,
    },
  };
};

const mapFieldToProp = (field: unknown): Record<string, unknown> => {
  const prop: Record<string, unknown> = {};

  const fieldObj = field as Record<string, unknown>;

  const defaultValue = (fieldObj._def as { defaultValue?: unknown } | undefined)
    ?.defaultValue;
  if (defaultValue !== undefined) {
    prop.default = defaultValue;
  }

  if (fieldObj.description) {
    prop.description = fieldObj.description;
  }

  let base = fieldObj as Record<string, unknown> & {
    unwrap?: () => unknown;
  };
  if (base.unwrap && (base.type === "default" || base.type === "optional")) {
    base = base.unwrap() as Record<string, unknown> & {
      unwrap?: () => unknown;
    };
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
      const element = (base._def as { element?: { type?: string } } | undefined)
        ?.element;
      if (element) {
        prop.items = { type: element.type ?? "string" };
      }
      break;
    }
    default: {
      break;
    }
  }

  return prop;
};

export const zodToJsonSchemaShape = (
  schema: Record<string, unknown>
): Record<string, unknown> => {
  const { shape } = schema as { shape?: Record<string, unknown> };
  if (!shape) {
    return {};
  }

  const properties: Record<string, Record<string, unknown>> = {};

  for (const [key, field] of Object.entries(shape)) {
    properties[key] = mapFieldToProp(field);
  }

  return { properties };
};
