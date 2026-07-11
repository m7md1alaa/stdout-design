import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { pathToFileURL } from "node:url";

import { studioConfigSchema } from "../shared/config-schema.js";
import { AppError, ErrorCode } from "../shared/error-codes.js";
import { logDebug } from "../shared/logger.js";
import type { StudioConfig, TemplateModule } from "../shared/types.js";
import { isZodObject } from "../shared/validation.js";

export interface LoadedTemplate {
  module: TemplateModule;
  contentHash: string;
}

export const loadConfig = async (rootDir: string): Promise<StudioConfig> => {
  const configPath = path.resolve(rootDir, "studio.config.ts");

  try {
    await readFile(configPath, "utf-8");
  } catch {
    throw new AppError(
      ErrorCode.CONFIG_NOT_FOUND,
      `No studio.config.ts found in ${rootDir}.`
    );
  }

  logDebug("Loading studio.config.ts", { path: configPath });

  const mod = await import(pathToFileURL(configPath).href);
  const raw = mod.default ?? mod;

  const parsed = studioConfigSchema.safeParse(raw);
  if (!parsed.success) {
    const issues = parsed.error.issues
      .map(
        (issue: { path: PropertyKey[]; message: string }) =>
          `${issue.path.join(".") || "(root)"}: ${issue.message}`
      )
      .join("; ");
    throw new AppError(
      ErrorCode.CONFIG_INVALID,
      `studio.config.ts is invalid: ${issues}`
    );
  }

  return parsed.data;
};

export const importTemplateForBatch = async (
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

export const parseDataFile = async (
  filePath: string
): Promise<Record<string, unknown>[]> => {
  const content = await readFile(filePath, "utf-8");

  if (filePath.endsWith(".json")) {
    const data = JSON.parse(content);
    if (Array.isArray(data)) {
      return data as Record<string, unknown>[];
    }
    throw new AppError(
      ErrorCode.API_ERROR,
      "JSON data file must contain an array of objects."
    );
  }

  if (filePath.endsWith(".csv")) {
    // CSV parsing loaded lazily to avoid a hard dependency
    const { parse } = await import("csv-parse/sync");
    const rows = parse(content, {
      columns: true,
      skip_empty_lines: true,
      trim: true,
    }) as unknown[];
    return rows as Record<string, unknown>[];
  }

  throw new AppError(ErrorCode.API_ERROR, "Data file must be .csv or .json.");
};

export const resolveLocales = async (
  rootDir: string,
  localeCodes: string[],
  templateId: string
): Promise<{ id: string; data?: Record<string, unknown> }[]> => {
  if (localeCodes.length === 0) {
    return [{ id: "default" }];
  }

  const entries = await Promise.all(
    localeCodes.map(async (code) => {
      const localePath = path.resolve(rootDir, `locales/${code}.json`);
      try {
        const content = await readFile(localePath, "utf-8");
        const parsed = JSON.parse(content) as Record<
          string,
          Record<string, unknown>
        >;
        const data = parsed[templateId];
        return { data, id: code };
      } catch {
        return { id: code };
      }
    })
  );

  return entries;
};
