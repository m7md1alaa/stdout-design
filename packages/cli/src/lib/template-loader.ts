import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { pathToFileURL } from "node:url";

import {
  AppError,
  ErrorCode,
  isZodObject,
  logDebug,
} from "@stdout-design/core";
import type { TemplateModule } from "@stdout-design/core";

export interface LoadedTemplate {
  module: TemplateModule;
  contentHash: string;
}

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

  if (typeof (mod as Record<string, unknown>).default !== "function") {
    throw new AppError(
      ErrorCode.TEMPLATE_INVALID_EXPORT,
      `Template "${templateId}" must have a default export that is a component function.`,
      { templateId }
    );
  }

  const { propsSchema } = mod as { propsSchema: unknown };
  if (!isZodObject(propsSchema)) {
    throw new AppError(
      ErrorCode.TEMPLATE_INVALID_EXPORT,
      `Template "${templateId}" must export a "propsSchema" that is a z.object({...}).`,
      { templateId }
    );
  }

  return {
    contentHash,
    module: mod as TemplateModule,
  };
};
