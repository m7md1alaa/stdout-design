import { readFile } from "node:fs/promises";
import path from "node:path";
import { pathToFileURL } from "node:url";

import {
  AppError,
  ErrorCode,
  logDebug,
  studioConfigSchema,
} from "@stdout-design/core";
import type { StudioConfig } from "@stdout-design/core";

export const loadConfig = async (rootDir: string): Promise<StudioConfig> => {
  const configPath = path.resolve(rootDir, "studio.config.ts");

  try {
    await readFile(configPath, "utf-8");
  } catch {
    throw new AppError(
      ErrorCode.CONFIG_NOT_FOUND,
      `No studio.config.ts found in ${rootDir}. Run \`studio init\` to create one.`
    );
  }

  logDebug("Loading studio.config.ts", { path: configPath });

  const mod = await import(pathToFileURL(configPath).href);
  const raw = mod.default ?? mod;

  const parsed = studioConfigSchema.safeParse(raw);
  if (!parsed.success) {
    const issues = parsed.error.issues
      .map((issue) => `${issue.path.join(".") || "(root)"}: ${issue.message}`)
      .join("; ");
    throw new AppError(
      ErrorCode.CONFIG_INVALID,
      `studio.config.ts is invalid: ${issues}`
    );
  }

  return parsed.data;
};
