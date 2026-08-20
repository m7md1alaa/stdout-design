import { writeFile } from "node:fs/promises";

import type { ComponentType } from "react";

import type { ImagePolicy } from "../assets/image-resolver.js";
import { generateOutputFilename } from "../batch/naming.js";
import type { RenderCache } from "../cache/render-cache.js";
import type { PropSchema } from "../shared/validation.js";
import { orchestrateRender } from "./orchestrate.js";
import { ensureDir } from "./utils.js";

export interface SingleInput {
  component: ComponentType<Record<string, unknown>>;
  propsSchema: PropSchema;
  props: Record<string, unknown>;
  preset: { id: string; width: number; height: number };
  outDir?: string;
  format?: "webp" | "png" | "jpeg" | "ico" | "raw";
  /**
   * `renderComponent` is a direct programmatic API, not a project loaded
   * from `studio.config.ts` -- there's no config file to source this from.
   * The caller (trusted code, not request props) is the policy source
   * here, same tier as `OgResponseOptions.images`. Unset denies every
   * external image URL. See ADR-0018.
   */
  images?: ImagePolicy;
}

export interface SingleOutput {
  outputPath: string;
}

// eslint-disable-next-line no-empty-function
const noop = (): void => {};

const noopCache = {
  getCompiled: () => null,
  getPixels: () => null,
  setCompiledWithContentHash: noop,
  setPixels: noop,
} as unknown as RenderCache;

export const renderComponent = async (
  input: SingleInput
): Promise<SingleOutput> => {
  const {
    component,
    format = "png",
    images,
    outDir = "./out",
    preset,
    props,
    propsSchema,
  } = input;

  const result = await orchestrateRender({
    cache: noopCache,
    component,
    format,
    height: preset.height,
    images,
    props,
    propsSchema,
    templateContentHash: "single",
    templateId: "single",
    width: preset.width,
  });

  const filename = generateOutputFilename({
    locale: "default",
    presetId: preset.id,
    rowKey: "single",
    templateId: "single",
  });

  const outputPath = `${outDir}/${filename}`;
  await ensureDir(outDir);
  await writeFile(outputPath, result.bytes as unknown as Uint8Array);

  return { outputPath };
};
