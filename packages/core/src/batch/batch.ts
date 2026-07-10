import path from "node:path";

import { googleFonts } from "@takumi-rs/helpers";
import type { ComponentType } from "react";
import { createElement } from "react";

import { RenderCache } from "../node/render-cache.js";
import type { Font } from "../node/takumi-types-shim.js";
import { compileTemplate } from "../shared/render.js";
import {
  loadConfig,
  loadTemplate,
  parseDataFile,
  resolveLocales,
} from "./loaders.js";
import { writeManifest } from "./manifest.js";
import { expandMatrix } from "./matrix.js";
import { generateOutputFilename } from "./naming.js";
import { renderOne } from "./render-one.js";
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

  const entry = config.templates[templateId];
  if (!entry) {
    throw new Error(`Template not found: ${templateId}`);
  }

  const { contentHash, module } = await loadTemplate(
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
  const locales = await resolveLocales(rootDir, localeCodes, templateId);

  const rows = dataFile
    ? await parseDataFile(path.resolve(rootDir, dataFile))
    : (inlineRows ?? []);

  const cells = expandMatrix({ baseProps, locales, presets, rows });

  const outDir = path.resolve(
    rootDir,
    outDirOverride ?? config.outDir ?? "./out"
  );

  const cacheDir = cacheDirOverride ?? path.resolve(rootDir, ".studio-cache");
  const cache = new RenderCache({ cacheDir });
  await cache.init();

  const arabicLocales = locales.filter((l) => l.id.startsWith("ar"));
  let fonts: Font[] = [];
  let fontFamilies: string[] | undefined;
  if (arabicLocales.length > 0) {
    fonts = await googleFonts([
      { name: "Noto Sans Arabic", weight: [400, 700] },
    ]);
    fontFamilies = ["Noto Sans Arabic"];
  }

  const succeeded: Manifest["succeeded"] = [];
  const failed: Manifest["failed"] = [];

  const renderOptions = fonts.length > 0 ? { fontFamilies, fonts } : undefined;

  try {
    // oxlint-disable eslint/no-await-in-loop
    for (const cell of cells) {
      try {
        const element = createElement(
          Component,
          cell.props as Record<string, unknown>
        );
        const compiled = await compileTemplate(element);

        const filename = generateOutputFilename({
          locale: cell.locale,
          presetId: cell.preset.id,
          rowKey: cell.rowKey,
          templateId,
        });

        const result = await renderOne({
          cache,
          compiledTemplate: compiled,
          contentHash,
          filename,
          height: cell.preset.height,
          locale: cell.locale,
          outDir,
          props: cell.props,
          renderOptions,
          templateId,
          width: cell.preset.width,
        });

        succeeded.push({
          cacheHit: result.cacheHit,
          locale: cell.locale,
          outputPath: result.outputPath,
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
