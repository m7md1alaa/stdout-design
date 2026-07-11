import { RenderCache } from "../node/render-cache.js";
import { renderToPixels } from "../node/renderer.js";
import { logDebug } from "../shared/logger.js";
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
    locale,
    cache,
    outDir,
    filename,
    signal,
    renderOptions,
  } = input;

  const propsJSON = JSON.stringify(props);

  const pixelKey = RenderCache.createPixelCacheKey({
    format,
    height,
    propsJSON,
    templateContentHash: contentHash,
    width,
  });

  const cached = await cache.getPixels(pixelKey);
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

  const lang = locale?.startsWith("ar") ? "ar" : undefined;

  logDebug("renderOne -> renderToPixels", {
    fontFamilies: renderOptions?.fontFamilies,
    fontNames: renderOptions?.fonts?.map((f) =>
      typeof f === "object" && "name" in f
        ? (f as { name: string }).name
        : "raw"
    ),
    fontsCount: renderOptions?.fonts?.length ?? 0,
    lang,
    locale,
  });

  const output = await renderToPixels(
    compiledTemplate,
    { height, width },
    {
      fontFamilies: renderOptions?.fontFamilies,
      fonts: renderOptions?.fonts,
      format,
      lang,
    },
    signal
  );

  await cache.setPixels(pixelKey, output.bytes, width, height, format);

  const outputPath = `${outDir}/${filename}`;
  await ensureDir(outDir);
  await tryWriteFile(outputPath, output.bytes);

  return {
    cacheHit: false,
    durationMs: performance.now() - start,
    outputPath,
  };
};
