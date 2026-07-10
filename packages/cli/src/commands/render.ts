import {
  runBatch,
  ErrorCode,
  AppError,
  zodToJsonSchemaShape,
  loadConfig,
  loadTemplate,
} from "@stdout-design/core";

import { formatManifestSummary } from "../lib/display.js";
import { parsePropArgs, mergeDefaultProps } from "../lib/prop-parser.js";
import { suggestClosest } from "../lib/suggest.js";

interface RenderOptions {
  data?: string;
  preset?: string;
  locale?: string;
  outDir?: string;
  concurrency?: string;
  failFast?: boolean;
  json?: boolean;
}

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

  const { module } = await loadTemplate(
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

  const presetIds = options.preset
    ? options.preset.split(",").map((s) => s.trim())
    : config.presets.map((p) => p.id);

  const localeIds = options.locale
    ? options.locale.split(",").map((s) => s.trim())
    : undefined;

  const outDir = options.outDir ?? config.outDir ?? "out";
  const concurrency = Number(options.concurrency ?? "4");

  const { manifest } = await runBatch({
    baseProps: mergedProps,
    concurrency,
    dataFile: options.data,
    failFast: options.failFast,
    locales: localeIds,
    outDir,
    presets: presetIds,
    rootDir,
    rows: options.data ? undefined : [{}],
    templateId,
  });

  if (options.json) {
    console.log(JSON.stringify(manifest, null, 2));
  } else {
    console.log(formatManifestSummary(manifest));
  }

  if (manifest.failed.length > 0) {
    process.exit(1);
  }
};
