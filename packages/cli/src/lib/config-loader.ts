import { readFile } from "node:fs/promises";
import path from "node:path";
import { pathToFileURL } from "node:url";

import { ErrorCode, AppError, logDebug } from "@stdout-design/core";

export interface StudioConfig {
  templates: Record<string, { componentPath: string; description?: string }>;
  presets: {
    id: string;
    width: number;
    height: number;
    platform: string;
  }[];
  defaultPreset?: string;
  locales?: string[];
  outDir?: string;
}

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

  if (!raw || typeof raw !== "object") {
    throw new AppError(
      ErrorCode.CONFIG_INVALID,
      "studio.config.ts must export a default config object."
    );
  }

  if (!raw.templates || typeof raw.templates !== "object") {
    throw new AppError(
      ErrorCode.CONFIG_INVALID,
      'studio.config.ts must have a "templates" record.'
    );
  }

  if (!Array.isArray(raw.presets) || raw.presets.length === 0) {
    throw new AppError(
      ErrorCode.CONFIG_INVALID,
      'studio.config.ts must have a "presets" array with at least one preset.'
    );
  }

  return raw as StudioConfig;
};
