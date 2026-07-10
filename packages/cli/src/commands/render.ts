import { readFile } from "node:fs/promises";
import path from "node:path";

import {
  expandMatrix,
  generateOutputFilename,
  renderOne,
  writeManifest,
} from "@stdout-design/batch-engine";
import {
  compileTemplate,
  ErrorCode,
  AppError,
  logError,
  logDebug,
  RenderCache,
  validateProps,
} from "@stdout-design/core";
import { parse } from "csv-parse/sync";
import { createElement } from "react";

import { loadConfig } from "../lib/config-loader.js";
import { formatManifestSummary } from "../lib/display.js";
import { parsePropArgs, mergeDefaultProps } from "../lib/prop-parser.js";
import { suggestClosest } from "../lib/suggest.js";
import { loadTemplate, zodToJsonSchemaShape } from "../lib/template-loader.js";

interface RenderOptions {
  data?: string;
  preset?: string;
  locale?: string;
  outDir?: string;
  concurrency?: string;
  failFast?: boolean;
  json?: boolean;
}

const parseDataFile = async (filePath: string): Promise<unknown[]> => {
  const content = await readFile(filePath, "utf-8");

  if (filePath.endsWith(".csv")) {
    return parse(content, {
      columns: true,
      skip_empty_lines: true,
      trim: true,
    }) as unknown[];
  }

  if (filePath.endsWith(".json")) {
    const data = JSON.parse(content);
    if (Array.isArray(data)) {
      return data;
    }
    throw new AppError(
      ErrorCode.API_ERROR,
      "JSON data file must contain an array of objects."
    );
  }

  throw new AppError(ErrorCode.API_ERROR, "Data file must be .csv or .json.");
};

const loadLocaleFile = async (
  rootDir: string,
  locale: string
): Promise<Record<string, unknown> | undefined> => {
  const localePath = path.resolve(rootDir, `locales/${locale}.json`);
  try {
    const content = await readFile(localePath, "utf-8");
    return JSON.parse(content) as Record<string, unknown>;
  } catch {
    return undefined;
  }
};

const runWithConcurrency = async <T>(
  items: T[],
  fn: (item: T) => Promise<void>,
  concurrency: number
): Promise<void> => {
  const chunks: T[][] = [];
  for (let i = 0; i < items.length; i += concurrency) {
    chunks.push(items.slice(i, i + concurrency));
  }

  const processBatches = chunks.map(async (chunk) => {
    await Promise.all(chunk.map(fn));
  });

  await Promise.all(processBatches);
};

const singleRender = async (
  templateId: string,
  module: { default: (props: Record<string, unknown>) => unknown },
  contentHash: string,
  props: Record<string, unknown>,
  preset: { id: string; width: number; height: number },
  cache: RenderCache,
  outDir: string
): Promise<void> => {
  logDebug("Single render", { preset: preset.id, templateId });

  const Component = module.default as (
    props: Record<string, unknown>
  ) => ReturnType<typeof createElement>;
  const element = createElement(Component, props);
  const compiled = await compileTemplate(element);

  const filename = generateOutputFilename({
    locale: "default",
    presetId: preset.id,
    rowKey: "single",
    templateId,
  });

  const result = await renderOne({
    cache,
    compiledTemplate: compiled,
    contentHash,
    filename,
    height: preset.height,
    outDir,
    props,
    templateId,
    width: preset.width,
  });

  console.log(
    `Rendered: ${result.outputPath}${result.cacheHit ? " (cached)" : ""}`
  );
};

const batchRender = async (
  rootDir: string,
  templateId: string,
  module: { default: (props: Record<string, unknown>) => unknown },
  contentHash: string,
  validatedProps: Record<string, unknown>,
  presets: { id: string; width: number; height: number }[],
  dataFile: string,
  options: RenderOptions,
  cache: RenderCache,
  outDir: string
): Promise<void> => {
  const dataFilePath = path.resolve(rootDir, dataFile);
  const rows = await parseDataFile(dataFilePath);

  const configLocales = options.locale
    ? options.locale.split(",").map((s) => s.trim())
    : [];

  const localeEntries: { id: string; data?: Record<string, unknown> }[] = [];

  if (configLocales.length > 0) {
    const entries = await Promise.all(
      configLocales.map(async (id) => {
        const data = await loadLocaleFile(rootDir, id);
        return { data, id };
      })
    );
    localeEntries.push(...entries);
  } else {
    localeEntries.push({ id: "default" });
  }

  const cells = expandMatrix({
    baseProps: validatedProps,
    locales: localeEntries,
    presets,
    rows: rows as Record<string, unknown>[],
  });

  const concurrency = Number(options.concurrency ?? "4");

  const manifestFile = path.resolve(outDir, "manifest.json");

  const succeeded: {
    rowIndex: number;
    locale: string;
    preset: string;
    outputPath: string;
    cacheHit: boolean;
  }[] = [];

  const failed: {
    rowIndex: number;
    locale: string;
    preset: string;
    error: string;
  }[] = [];

  let completedCount = 0;
  const total = cells.length;

  logDebug(`Batch render: ${total} cells, concurrency=${concurrency}`, {
    cellCount: total,
    concurrency,
  });

  console.log(`Rendering ${total} assets...`);

  const processCell = async (cell: (typeof cells)[number]): Promise<void> => {
    try {
      const BatchComponent = module.default as (
        props: Record<string, unknown>
      ) => ReturnType<typeof createElement>;
      const element = createElement(BatchComponent, cell.props);
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
        outDir,
        props: cell.props,
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
      logError(
        ErrorCode.RENDER_FAILED,
        `Cell failed: row=${cell.rowIndex}, locale=${cell.locale}, preset=${cell.preset.id}`,
        {
          error: error instanceof Error ? error.message : String(error),
          locale: cell.locale,
          preset: cell.preset.id,
          rowIndex: cell.rowIndex,
          templateId,
        }
      );

      failed.push({
        error: error instanceof Error ? error.message : String(error),
        locale: cell.locale,
        preset: cell.preset.id,
        rowIndex: cell.rowIndex,
      });

      if (options.failFast) {
        throw new AppError(
          ErrorCode.RENDER_FAILED,
          `Render failed at cell ${completedCount + 1}/${total}, aborting.`
        );
      }
    }

    completedCount += 1;

    if (
      completedCount % Math.max(1, Math.floor(total / 20)) === 0 ||
      completedCount === total
    ) {
      console.log(
        `  [${completedCount}/${total}] ${((completedCount / total) * 100).toFixed(0)}%`
      );
    }
  };

  try {
    await runWithConcurrency(cells, processCell, concurrency);
  } catch {
    // failFast triggered abort — continue to write partial manifest
  }

  const manifest = {
    completedCount,
    failed,
    status:
      options.failFast && failed.length > 0
        ? ("aborted" as const)
        : ("completed" as const),
    succeeded,
    totalCount: total,
  };

  await writeManifest(manifestFile, manifest);

  if (options.json) {
    console.log(JSON.stringify(manifest, null, 2));
  } else {
    console.log(formatManifestSummary(manifest));
  }

  if (failed.length > 0) {
    process.exit(1);
  }
};

export const render = async (
  templateId: string,
  propArgs: string[],
  options: RenderOptions
): Promise<void> => {
  const rootDir = process.cwd();

  const config = await loadConfig(rootDir);

  const templateEntry = config.templates[templateId];
  if (!templateEntry) {
    const suggestions = suggestClosest(
      templateId,
      Object.keys(config.templates)
    );
    const hint = suggestions ? ` Did you mean "${suggestions}"?` : "";

    throw new AppError(
      ErrorCode.TEMPLATE_NOT_FOUND,
      `Template "${templateId}" not found in studio.config.ts.${hint}`,
      { availableTemplates: Object.keys(config.templates), templateId }
    );
  }

  const { module, contentHash } = await loadTemplate(
    rootDir,
    templateEntry.componentPath,
    templateId
  );

  const schema = zodToJsonSchemaShape(module.propsSchema) as {
    properties: Record<
      string,
      {
        type: string;
        default?: unknown;
        description?: string;
        items?: { type: string };
      }
    >;
  };
  const parsedProps = parsePropArgs(propArgs, schema);
  const mergedProps = mergeDefaultProps(schema, parsedProps);

  const validatedProps = validateProps(
    module.propsSchema as unknown as Parameters<typeof validateProps>[0],
    mergedProps
  );

  let presetIds: string[];

  if (options.preset) {
    presetIds = options.preset.split(",").map((s) => s.trim());
  } else if (config.defaultPreset) {
    presetIds = [config.defaultPreset];
  } else {
    presetIds = [];
  }

  if (presetIds.length === 0) {
    const [first] = config.presets;
    if (first) {
      presetIds.push(first.id);
    } else {
      throw new AppError(
        ErrorCode.CONFIG_INVALID,
        "No presets configured and no defaultPreset set."
      );
    }
  }

  const presets = presetIds.map((id) => {
    const preset = config.presets.find((p) => p.id === id);
    if (!preset) {
      const suggestions = suggestClosest(
        id,
        config.presets.map((p) => p.id)
      );
      const hint = suggestions ? ` Did you mean "${suggestions}"?` : "";
      throw new AppError(
        ErrorCode.CONFIG_INVALID,
        `Preset "${id}" not found.${hint}`,
        { availablePresets: config.presets.map((p) => p.id), presetId: id }
      );
    }
    return preset;
  });

  const outDir = path.resolve(
    rootDir,
    options.outDir ?? config.outDir ?? "out"
  );
  const cacheDir = path.resolve(rootDir, ".studio-cache");

  const cache = new RenderCache({ cacheDir });
  await cache.init();

  try {
    if (options.data) {
      await batchRender(
        rootDir,
        templateId,
        module,
        contentHash,
        validatedProps,
        presets,
        options.data,
        options,
        cache,
        outDir
      );
    } else {
      const [firstPreset] = presets;
      if (!firstPreset) {
        throw new AppError(
          ErrorCode.CONFIG_INVALID,
          "No presets available to render."
        );
      }

      await singleRender(
        templateId,
        module,
        contentHash,
        validatedProps,
        firstPreset,
        cache,
        outDir
      );
    }
  } finally {
    cache.close();
  }
};
