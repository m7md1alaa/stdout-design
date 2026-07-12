import { AppError, ErrorCode } from "@stdout-design/core";

import { suggestClosest } from "../lib/suggest.js";

export interface ResolvedBatchOptions {
  concurrency: number;
  dataFile?: string;
  failFast?: boolean;
  locales?: string[];
  outDir: string;
  presets: string[];
}

export interface ResolvedTemplate {
  componentPath: string;
  templateId: string;
}

export const resolveTemplate = (
  config: {
    templates: Record<string, { componentPath: string; description?: string }>;
  },
  templateId: string
): ResolvedTemplate => {
  const entry = config.templates[templateId];
  if (!entry) {
    const candidates = Object.keys(config.templates);
    const suggestion = suggestClosest(templateId, candidates);
    const hint = suggestion ? ` Did you mean "${suggestion}"?` : "";

    throw new AppError(
      ErrorCode.TEMPLATE_NOT_FOUND,
      `Template "${templateId}" not found in studio.config.ts.${hint}`,
      { availableTemplates: candidates, templateId }
    );
  }

  return { componentPath: entry.componentPath, templateId };
};

export const resolveBatchOptions = (
  config: {
    outDir?: string;
    presets: { id: string }[];
  },
  options?: {
    concurrency?: string;
    data?: string;
    failFast?: boolean;
    locale?: string;
    outDir?: string;
    preset?: string;
  }
): ResolvedBatchOptions => {
  const presetIds = options?.preset
    ? options.preset.split(",").map((s) => s.trim())
    : config.presets.map((p) => p.id);

  const localeIds = options?.locale
    ? options.locale.split(",").map((s) => s.trim())
    : undefined;

  return {
    concurrency: Number(options?.concurrency ?? "4"),
    dataFile: options?.data,
    failFast: options?.failFast,
    locales: localeIds,
    outDir: options?.outDir ?? config.outDir ?? "out",
    presets: presetIds,
  };
};
