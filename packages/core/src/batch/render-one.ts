import { RenderCache } from "../node/render-cache.js";
import { renderToPixels } from "../node/renderer.js";
import type { RenderOneInput, RenderOneOutput } from "./types.js";
import { ensureDir, tryWriteFile } from "./utils.js";

export const renderOne = async (
  input: RenderOneInput
): Promise<RenderOneOutput> => {
  const start = performance.now();

  const {
    compiledTemplate,
    contentHash,
    props,
    width,
    height,
    format = "png",
    cache,
    outDir,
    filename,
    signal,
  } = input;

  const propsJSON = JSON.stringify(props);

  const stageBKey = RenderCache.createStageBKey({
    format,
    height,
    propsJSON,
    templateContentHash: contentHash,
    width,
  });

  const cached = await cache.getStageB(stageBKey);
  if (cached) {
    const outputPath = `${outDir}/${filename}`;
    await ensureDir(outDir);
    await tryWriteFile(outputPath, cached);

    return {
      cacheHit: true,
      durationMs: performance.now() - start,
      outputPath,
    };
  }

  const output = await renderToPixels(
    compiledTemplate,
    { height, width },
    { format },
    signal
  );

  await cache.setStageB(stageBKey, output.bytes, width, height, format);

  const outputPath = `${outDir}/${filename}`;
  await ensureDir(outDir);
  await tryWriteFile(outputPath, output.bytes);

  return {
    cacheHit: false,
    durationMs: performance.now() - start,
    outputPath,
  };
};
