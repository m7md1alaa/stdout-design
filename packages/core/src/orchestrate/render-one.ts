import { logDebug } from "../shared/logger.js";
import { orchestrateRender } from "./orchestrate.js";
import type { RenderOneInput, RenderOneOutput } from "./types.js";
import { ensureDir, tryWriteFile } from "./utils.js";

export const renderOne = async (
  input: RenderOneInput
): Promise<RenderOneOutput> => {
  const {
    compiledTemplate,
    contentHash,
    props,
    width,
    height,
    format = "png",
    locale,
    cache,
    outDir,
    filename,
    signal,
    renderOptions,
    templateId,
  } = input;

  logDebug("renderOne -> orchestrateRender", {
    fontFamilies: renderOptions?.fontFamilies,
    fontNames: renderOptions?.fonts?.map((f) =>
      typeof f === "object" && "name" in f
        ? (f as { name: string }).name
        : "raw"
    ),
    fontsCount: renderOptions?.fonts?.length ?? 0,
    locale,
  });

  const result = await orchestrateRender({
    cache,
    compiledTemplate,
    fontFamilies: renderOptions?.fontFamilies,
    fonts: renderOptions?.fonts,
    format,
    height,
    locale,
    props,
    signal,
    templateContentHash: contentHash,
    templateId,
    width,
  });

  const outputPath = `${outDir}/${filename}`;
  await ensureDir(outDir);
  await tryWriteFile(outputPath, result.bytes);

  return {
    cacheHit: result.cacheHit,
    durationMs: result.durationMs,
    outputPath,
  };
};
