import { createElement } from "react";

import { resolveAssetsForLocale } from "../assets/assets-resolver.js";
import { classifyLocale } from "../assets/classify-locale.js";
import { defaultFetchFonts } from "../assets/default-fonts.js";
import { mergeLocaleProps } from "../assets/merge-locale-props.js";
import { RenderCache } from "../cache/render-cache.js";
import { compileTemplate } from "../engine/render.js";
import type { CompiledTemplate } from "../engine/render.js";
import { measureTemplate, renderToPixels } from "../engine/renderer.js";
import type { Font } from "../engine/takumi-types-shim.js";
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
    cache,
  } = input;

  const validated = propsSchema
    ? validateProps(propsSchema, props)
    : { ...props };

  let merged = validated as Record<string, unknown>;
  if (loadLocaleData) {
    const localeData = await loadLocaleData(locale);
    merged = mergeLocaleProps(merged, localeData);
  }

  const {
    fonts: resolvedFonts,
    fontFamilies: resolvedFontFamilies,
    lang: resolvedLang,
  } = preResolvedFonts
    ? {
        fontFamilies: preResolvedFontFamilies,
        fonts: preResolvedFonts,
        lang: classifyLocale(locale).lang,
      }
    : await resolveAssetsForLocale(locale, merged, {
        fetchFonts: defaultFetchFonts,
      });

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

  return {
    compileKey,
    compiled,
    mergedProps: merged,
    propsJSON,
    resolvedFontFamilies,
    resolvedFonts,
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
    fonts: preResolvedFonts,
    fontFamilies: preResolvedFontFamilies,
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
    prep.compiled,
    { height, width },
    {
      fontFamilies:
        (prep.resolvedFontFamilies ?? []).length > 0
          ? prep.resolvedFontFamilies
          : undefined,
      fonts: prep.resolvedFonts.length > 0 ? prep.resolvedFonts : undefined,
      format,
      lang: prep.resolvedLang,
    },
    signal
  );

  await cache.setPixels(pixelKey, output.bytes, width, height, format);

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
    cache,
    signal,
  } = input;

  const resolvedLocale = localeId ?? "default";

  const prep = await prepPipeline({
    cache,
    compiledTemplate,
    component,
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
    prep.compiled,
    {
      fontFamilies:
        (prep.resolvedFontFamilies ?? []).length > 0
          ? prep.resolvedFontFamilies
          : undefined,
      fonts: prep.resolvedFonts.length > 0 ? prep.resolvedFonts : undefined,
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
