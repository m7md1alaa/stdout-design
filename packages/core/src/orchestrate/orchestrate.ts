import { createElement } from "react";

import type { FontResolutionResult } from "../assets/assets-resolver.js";
import { resolveAssetsForLocale } from "../assets/assets-resolver.js";
import type {
  ImagePolicy,
  ImageSourceEntry,
} from "../assets/image-resolver.js";
import { resolveImages } from "../assets/image-resolver.js";
import { RenderCache } from "../cache/render-cache.js";
import { compileTemplate } from "../engine/render.js";
import type { CompiledTemplate } from "../engine/render.js";
import { measureTemplate, renderToPixels } from "../engine/renderer.js";
import type { Font } from "../engine/takumi-types-shim.js";
import { logWarn } from "../shared/logger.js";
import type { PropSchema } from "../shared/validation.js";
import { validateProps } from "../shared/validation.js";
import type {
  OrchestrateMeasureInput,
  OrchestrateMeasureResult,
  OrchestrateRenderInput,
  OrchestrateRenderResult,
} from "./types.js";

interface PrepResult {
  compiled: CompiledTemplate;
  /**
   * The template ready to hand to `renderToPixels`/`measureTemplate`:
   * identical to `compiled` unless emoji extraction changed its node (see
   * `assets/image-resolver.ts`). Never written to the compile cache --
   * image/emoji resolution is policy-dependent per call, while `compiled`
   * is reusable across any policy.
   */
  renderReady: CompiledTemplate;
  resolvedImages: ImageSourceEntry[];
  mergedProps: Record<string, unknown>;
  propsJSON: string;
  compileKey: string;
  resolvedFonts: Font[];
  resolvedFontFamilies: string[] | undefined;
  resolvedLang: string | undefined;
}

const prepPipeline = async (input: {
  compiledTemplate: CompiledTemplate | undefined;
  component: unknown;
  templateContentHash: string;
  templateId: string;
  props: Record<string, unknown>;
  propsSchema: PropSchema | undefined;
  locale: string;
  loadLocaleData:
    | ((locale: string) => Promise<Record<string, unknown>>)
    | undefined;
  preResolvedFonts: Font[] | undefined;
  preResolvedFontFamilies: string[] | undefined;
  fetchFonts:
    | ((localeId: string) => Promise<FontResolutionResult | null>)
    | undefined;
  images: ImagePolicy | undefined;
  cache: RenderCache;
}): Promise<PrepResult> => {
  const {
    compiledTemplate: preCompiled,
    component,
    templateContentHash,
    templateId,
    props,
    propsSchema,
    locale,
    loadLocaleData,
    preResolvedFonts,
    preResolvedFontFamilies,
    fetchFonts,
    images,
    cache,
  } = input;

  const validated = propsSchema
    ? validateProps(propsSchema, props)
    : { ...props };

  const {
    fonts: resolvedFonts,
    fontFamilies: resolvedFontFamilies,
    lang: resolvedLang,
    props: merged,
  } = await resolveAssetsForLocale(
    locale,
    validated as Record<string, unknown>,
    {
      fetchFonts,
      loadLocaleData,
      preResolvedFontFamilies,
      preResolvedFonts,
    }
  );

  const propsJSON = JSON.stringify(merged);
  const compileKey = RenderCache.createCompileCacheKey({
    propsJSON,
    templateContentHash,
    templateId,
  });

  let compiled = preCompiled;
  if (!compiled) {
    if (!component) {
      throw new Error("Must provide either compiledTemplate or component");
    }
    const cachedCompile = cache.getCompiled(
      compileKey
    ) as CompiledTemplate | null;
    if (cachedCompile) {
      compiled = cachedCompile;
    } else {
      const element = createElement(
        component as React.ComponentType<Record<string, unknown>>,
        merged
      );
      compiled = await compileTemplate(element);
      cache.setCompiledWithContentHash(
        compileKey,
        templateContentHash,
        compiled
      );
    }
  }

  const { node: resolvedNode, images: resolvedImages } = await resolveImages(
    compiled.node,
    images
  );
  const renderReady: CompiledTemplate =
    resolvedNode === compiled.node
      ? compiled
      : { ...compiled, node: resolvedNode };

  return {
    compileKey,
    compiled,
    mergedProps: merged,
    propsJSON,
    renderReady,
    resolvedFontFamilies,
    resolvedFonts,
    resolvedImages,
    resolvedLang,
  };
};

export const orchestrateRender = async (
  input: OrchestrateRenderInput
): Promise<OrchestrateRenderResult> => {
  const start = performance.now();
  const {
    compiledTemplate,
    component,
    templateContentHash,
    templateId,
    props,
    propsSchema,
    locale: localeId,
    loadLocaleData,
    fetchFonts,
    fonts: preResolvedFonts,
    fontFamilies: preResolvedFontFamilies,
    images,
    width,
    height,
    cache,
    format = "png",
    signal,
  } = input;

  const resolvedLocale = localeId ?? "default";

  const prep = await prepPipeline({
    cache,
    compiledTemplate,
    component,
    fetchFonts,
    images,
    loadLocaleData,
    locale: resolvedLocale,
    preResolvedFontFamilies,
    preResolvedFonts,
    props,
    propsSchema,
    templateContentHash,
    templateId,
  });

  const pixelKey = RenderCache.createPixelCacheKey({
    format,
    height,
    propsJSON: prep.propsJSON,
    templateContentHash,
    width,
  });

  const cached = await cache.getPixels(pixelKey);
  if (cached) {
    return {
      bytes: cached,
      cacheHit: true,
      durationMs: performance.now() - start,
      format,
      height,
      width,
    };
  }

  const output = await renderToPixels(
    prep.renderReady,
    { height, width },
    {
      fontFamilies:
        (prep.resolvedFontFamilies ?? []).length > 0
          ? prep.resolvedFontFamilies
          : undefined,
      fonts: prep.resolvedFonts.length > 0 ? prep.resolvedFonts : undefined,
      format,
      images: prep.resolvedImages.length > 0 ? prep.resolvedImages : undefined,
      lang: prep.resolvedLang,
    },
    signal
  );

  try {
    await cache.setPixels(pixelKey, output.bytes, width, height, format);
  } catch (error: unknown) {
    logWarn("Failed to write to pixel cache", {
      error: String(error),
      pixelKey,
    });
  }

  return {
    bytes: output.bytes,
    cacheHit: false,
    durationMs: performance.now() - start,
    format,
    height: output.height,
    width: output.width,
  };
};

export const orchestrateMeasure = async (
  input: OrchestrateMeasureInput
): Promise<OrchestrateMeasureResult> => {
  const start = performance.now();
  const {
    compiledTemplate,
    component,
    templateContentHash,
    templateId,
    props,
    propsSchema,
    locale: localeId,
    loadLocaleData,
    fetchFonts,
    images,
    cache,
    signal,
  } = input;

  const resolvedLocale = localeId ?? "default";

  const prep = await prepPipeline({
    cache,
    compiledTemplate,
    component,
    fetchFonts,
    images,
    loadLocaleData,
    locale: resolvedLocale,
    preResolvedFontFamilies: undefined,
    preResolvedFonts: undefined,
    props,
    propsSchema,
    templateContentHash,
    templateId,
  });

  const measured = await measureTemplate(
    prep.renderReady,
    {
      fontFamilies:
        (prep.resolvedFontFamilies ?? []).length > 0
          ? prep.resolvedFontFamilies
          : undefined,
      fonts: prep.resolvedFonts.length > 0 ? prep.resolvedFonts : undefined,
      images: prep.resolvedImages.length > 0 ? prep.resolvedImages : undefined,
      lang: prep.resolvedLang,
    },
    signal
  );

  return {
    durationMs: performance.now() - start,
    height: measured.height,
    width: measured.width,
  };
};
