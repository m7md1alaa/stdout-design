import path from "node:path";

import type { ComponentType } from "react";

import { createFetchFontsFromConfig } from "../assets/font-config.js";
import { openCache } from "../cache/open-cache.js";
import { orchestrateRender } from "../orchestrate/orchestrate.js";
import { ensureDir, tryWriteFile } from "../orchestrate/utils.js";
import {
  importTemplateForBatch,
  loadConfig,
  parseDataFile,
  resolveLocales,
} from "./loaders.js";
import { writeManifest } from "./manifest.js";
import { expandMatrix } from "./matrix.js";
import { generateOutputFilename } from "./naming.js";
import type { Manifest } from "./types.js";

export interface BatchInput {
  rootDir: string;
  templateId: string;
  dataFile?: string;
  rows?: Record<string, unknown>[];
  baseProps?: Record<string, unknown>;
  presets?: string[];
  locales?: string[];
  outDir?: string;
  cacheDir?: string;
  concurrency?: number;
  failFast?: boolean;
}

export interface BatchOutput {
  manifest: Manifest;
  elapsedMs: number;
}

export const runBatch = async (input: BatchInput): Promise<BatchOutput> => {
  const start = performance.now();

  const {
    baseProps = {},
    dataFile,
    failFast = false,
    cacheDir: cacheDirOverride,
    locales: filterLocales,
    outDir: outDirOverride,
    presets: filterPresets,
    rootDir,
    rows: inlineRows,
    templateId,
  } = input;

  const config = await loadConfig(rootDir);

  const fetchFonts = createFetchFontsFromConfig(config.fonts, rootDir);

  const entry = config.templates[templateId];
  if (!entry) {
    throw new Error(`Template not found: ${templateId}`);
  }

  const { contentHash, module } = await importTemplateForBatch(
    rootDir,
    entry.componentPath,
    templateId
  );
  // eslint-disable-next-line typescript/no-explicit-any
  const Component = module.default as unknown as ComponentType<any>;

  const presetIds = filterPresets ?? config.presets.map((p) => p.id);
  const presets = presetIds.map((id) => {
    const p = config.presets.find((preset) => preset.id === id);
    if (!p) {
      throw new Error(`Preset not found: ${id}`);
    }
    return { height: p.height, id: p.id, width: p.width };
  });

  const localeCodes = filterLocales ?? config.locales ?? [];
  const resolvedLocales = await resolveLocales(
    rootDir,
    localeCodes,
    templateId
  );

  const localeDataMap = new Map(
    resolvedLocales.map((l) => [l.id, l.data ?? {}])
  );
  const loadLocaleData = (code: string): Promise<Record<string, unknown>> =>
    Promise.resolve(localeDataMap.get(code) ?? {});

  const rows = dataFile
    ? await parseDataFile(path.resolve(rootDir, dataFile))
    : (inlineRows ?? []);

  const cells = expandMatrix({
    baseProps,
    locales: resolvedLocales.map((l) => l.id),
    presets,
    rows,
  });

  const outDir = path.resolve(
    rootDir,
    outDirOverride ?? config.outDir ?? "./out"
  );

  const cache = await openCache(rootDir, { cacheDir: cacheDirOverride });

  const succeeded: Manifest["succeeded"] = [];
  const failed: Manifest["failed"] = [];

  try {
    // oxlint-disable eslint/no-await-in-loop
    for (const cell of cells) {
      try {
        const filename = generateOutputFilename({
          locale: cell.locale,
          presetId: cell.preset.id,
          rowKey: cell.rowKey,
          templateId,
        });

        const result = await orchestrateRender({
          cache,
          component: Component as ComponentType<Record<string, unknown>>,
          fetchFonts,
          format: "png",
          height: cell.preset.height,
          images: config.images,
          loadLocaleData,
          locale: cell.locale,
          props: cell.props,
          propsSchema: module.propsSchema,
          templateContentHash: contentHash,
          templateId,
          width: cell.preset.width,
        });

        const outputPath = `${outDir}/${filename}`;
        await ensureDir(outDir);
        await tryWriteFile(outputPath, result.bytes);

        succeeded.push({
          cacheHit: result.cacheHit,
          locale: cell.locale,
          outputPath,
          preset: cell.preset.id,
          rowIndex: cell.rowIndex,
        });
      } catch (error) {
        failed.push({
          error: error instanceof Error ? error.message : String(error),
          locale: cell.locale,
          preset: cell.preset.id,
          rowIndex: cell.rowIndex,
        });
        if (failFast) {
          throw error;
        }
      }
    }
  } finally {
    cache.close();
  }

  const manifest: Manifest = {
    completedCount: cells.length,
    failed,
    status: failFast && failed.length > 0 ? "aborted" : "completed",
    succeeded,
    totalCount: cells.length,
  };

  await writeManifest(`${outDir}/manifest.json`, manifest);

  const elapsedMs = performance.now() - start;

  return { elapsedMs, manifest };
};
