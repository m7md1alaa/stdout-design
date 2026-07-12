import {
  runBatch,
  zodToJsonSchemaShape,
  importTemplateForBatch,
  loadConfig,
} from "@stdout-design/core";

import { formatManifestSummary } from "../lib/display.js";
import { parsePropArgs, mergeDefaultProps } from "../lib/prop-parser.js";
import { resolveBatchOptions, resolveTemplate } from "./resolver.js";

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

  const resolved = resolveTemplate(config, templateId);

  const { module } = await importTemplateForBatch(
    rootDir,
    resolved.componentPath,
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

  const batchOpts = resolveBatchOptions(config, options);

  const { manifest } = await runBatch({
    baseProps: mergedProps,
    concurrency: batchOpts.concurrency,
    dataFile: batchOpts.dataFile,
    failFast: batchOpts.failFast,
    locales: batchOpts.locales,
    outDir: batchOpts.outDir,
    presets: batchOpts.presets,
    rootDir,
    rows: batchOpts.dataFile ? undefined : [{}],
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
