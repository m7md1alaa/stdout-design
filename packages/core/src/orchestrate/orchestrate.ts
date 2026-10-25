import { createElement, isValidElement } from "react";
import type { ComponentType, ReactElement } from "react";
import { z } from "zod";

import type { FontResolutionResult } from "../assets/assets-resolver.js";
import { resolveAssetsForLocale } from "../assets/assets-resolver.js";
import type { ImageSourceEntry } from "../assets/image-resolver.js";
import { resolveImages } from "../assets/image-resolver.js";
import { RenderCache } from "../cache/render-cache.js";
import { compileTemplate } from "../engine/render.js";
import type { CompiledTemplate } from "../engine/render.js";
import { measureTemplate, renderToPixels } from "../engine/renderer.js";
import type { Font } from "../engine/takumi-types-shim.js";
import { classifyLocale } from "../shared/locale.js";
import type { LocaleInfo } from "../shared/locale.js";
import { logWarn } from "../shared/logger.js";
import type { ImagePolicy } from "../shared/types.js";
import type { PropSchema } from "../shared/validation.js";
import { validateProps } from "../shared/validation.js";
import { legacyTemplateDefinition } from "../template/define-template.js";
import type { TemplateDefinition } from "../template/define-template.js";
import { createRenderContext, toCanvas } from "../template/render-context.js";
import type { Canvas } from "../template/render-context.js";
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

/** Canvas a measure-only render lays out against: the common link-preview size. */
const MEASURE_CANVAS = toCanvas(1200, 630);

/**
 * Gives the template's root the render's direction and language, unless
 * the template set its own. A root that isn't a host element is wrapped.
 */
const withLocaleRoot = (
  element: ReactElement,
  locale: LocaleInfo
): ReactElement => {
  if (isValidElement(element) && typeof element.type === "string") {
    // A host element's children live in its props, so re-creating it with
    // two more props is a faithful copy.
    const props = element.props as Record<string, unknown>;
    return createElement(element.type, {
      ...props,
      dir: props.dir ?? locale.dir,
      key: element.key,
      lang: props.lang ?? locale.lang,
    });
  }
  return createElement(
    "div",
    {
      dir: locale.dir,
      lang: locale.lang,
      style: { display: "flex", height: "100%", width: "100%" },
    },
    element
  );
};

const resolveDefinition = (input: {
  template: TemplateDefinition | undefined;
  component: ComponentType<Record<string, unknown>> | undefined;
  propsSchema: PropSchema | undefined;
  templateId: string;
}): TemplateDefinition | undefined => {
  if (input.template) {
    return input.template;
  }
  if (!input.component) {
    return undefined;
  }
  return legacyTemplateDefinition(
    input.component,
    input.propsSchema ?? z.looseObject({}),
    input.templateId
  );
};

const prepPipeline = async (input: {
  compiledTemplate: CompiledTemplate | undefined;
  template: TemplateDefinition | undefined;
  component: ComponentType<Record<string, unknown>> | undefined;
  templateContentHash: string;
  templateId: string;
  props: Record<string, unknown>;
  propsSchema: PropSchema | undefined;
  locale: string;
  canvas: Canvas;
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
    templateContentHash,
    templateId,
    props,
    locale,
    canvas,
    loadLocaleData,
    preResolvedFonts,
    preResolvedFontFamilies,
    fetchFonts,
    images,
    cache,
  } = input;

  const definition = resolveDefinition(input);
  const validated = definition
    ? validateProps(definition.propsSchema, props)
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

  const localeInfo = classifyLocale(locale);
  // Everything the compiled output depends on: the props and the render
  // context. Both cache keys hash this, so a locale or canvas change never
  // serves another render's output.
  const propsJSON = JSON.stringify({
    canvas: [canvas.width, canvas.height],
    locale: localeInfo.id,
    props: merged,
  });
  const compileKey = RenderCache.createCompileCacheKey({
    propsJSON,
    templateContentHash,
    templateId,
  });

  let compiled = preCompiled;
  if (!compiled) {
    if (!definition) {
      throw new Error("Must provide either compiledTemplate or a template");
    }
    const cachedCompile = cache.getCompiled(
      compileKey
    ) as CompiledTemplate | null;
    if (cachedCompile) {
      compiled = cachedCompile;
    } else {
      const ctx = createRenderContext({
        canvas,
        fonts: definition.fonts,
        locale: localeInfo,
      });
      const rendered = definition.render(merged, ctx);
      const element = definition.localeRoot
        ? withLocaleRoot(rendered, localeInfo)
        : rendered;
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
    template,
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
    canvas: toCanvas(width, height),
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
    template,
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
    template,
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
    canvasHint,
  } = input;

  const resolvedLocale = localeId ?? "default";

  const prep = await prepPipeline({
    cache,
    canvas: canvasHint
      ? toCanvas(canvasHint.width, canvasHint.height)
      : MEASURE_CANVAS,
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
    template,
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
