import type { CompiledTemplate } from "../shared/render.js";
import type {
  ConstructRendererOptions,
  MeasuredNode,
  RenderOptions,
  Renderer,
} from "./takumi-types-shim.js";
import { Renderer as RendererImpl } from "./takumi-types-shim.js";

/**
 * Renderer lifecycle.
 *
 * Takumi's own performance guidance is to reuse a single Renderer instance
 * across renders (it owns loaded fonts/persistent images, and recreating it
 * per-call throws that away). We keep one module-level singleton, but --
 * unlike a naive singleton -- we support reconfiguring it when
 * studio.config.ts changes (e.g. a font is added), instead of silently
 * keeping the stale renderer for the rest of the process's life.
 */

let activeRenderer: Renderer | null = null;
let activeConfigFingerprint: string | null = null;

const fingerprintConfig = (config?: ConstructRendererOptions): string => {
  // Cheap, stable-enough fingerprint for "did the renderer-relevant config
  // change" -- not a content hash of font bytes, just enough to detect that
  // the *set of inputs* changed so we know to rebuild.
  const fontCount = config?.fonts?.length ?? 0;
  const persistentImageCount = config?.persistentImages?.length ?? 0;
  return `${fontCount}:${persistentImageCount}:${config?.loadDefaultFonts ?? "auto"}`;
};

/**
 * Returns the current renderer, constructing it on first use. If `config`
 * differs from whatever the renderer was last constructed with, the
 * renderer is rebuilt -- callers (e.g. the file watcher reacting to
 * studio.config.ts changes) are expected to pass the current config each
 * time so this can detect drift, rather than silently reusing stale fonts.
 */
export const getRenderer = (config?: ConstructRendererOptions): Renderer => {
  const fingerprint = fingerprintConfig(config);

  if (activeRenderer && activeConfigFingerprint === fingerprint) {
    return activeRenderer;
  }

  activeRenderer = new RendererImpl({
    fonts: config?.fonts,
    loadDefaultFonts:
      config?.loadDefaultFonts ?? (config?.fonts?.length ? false : undefined),
    persistentImages: config?.persistentImages,
  });
  activeConfigFingerprint = fingerprint;

  return activeRenderer;
};

/** Forces the next getRenderer() call to construct a fresh instance. */
export const resetRenderer = (): void => {
  activeRenderer = null;
  activeConfigFingerprint = null;
};

export interface RenderOutput {
  bytes: Buffer;
  width: number;
  height: number;
  format: NonNullable<RenderOptions["format"]>;
}

/**
 * Renders a compiled template to pixels.
 *
 * `width`/`height` are REQUIRED here, not optional pass-through fields.
 * Takumi's `render()` returns only a Buffer -- it does not report back the
 * dimensions it used (auto-sized renders are genuinely possible via
 * Takumi's own API, but this wrapper does not support that mode, precisely
 * because there would be no reliable way to report the actual output
 * dimensions back to the caller for cache-key construction and manifest
 * metadata). Callers that need auto-sizing must call `measureTemplate`
 * first and pass the resulting width/height through explicitly.
 */
export const renderToPixels = async (
  template: CompiledTemplate,
  dimensions: { width: number; height: number },
  options?: Omit<RenderOptions, "width" | "height">,
  signal?: AbortSignal
): Promise<RenderOutput> => {
  const renderer = getRenderer();

  const bytes = await renderer.render(
    template.node,
    {
      ...options,
      height: dimensions.height,
      stylesheets: [...(options?.stylesheets ?? []), ...template.stylesheets],
      width: dimensions.width,
    },
    signal
  );

  return {
    bytes,
    format: options?.format ?? "png",
    height: dimensions.height,
    width: dimensions.width,
  };
};

export const measureTemplate = (
  template: CompiledTemplate,
  options?: RenderOptions,
  signal?: AbortSignal
): Promise<MeasuredNode> => {
  const renderer = getRenderer();

  return renderer.measure(
    template.node,
    {
      ...options,
      stylesheets: [...(options?.stylesheets ?? []), ...template.stylesheets],
    },
    signal
  );
};

/**
 * Convenience: measure to discover natural dimensions, then render at
 * those dimensions in one call. This is the "auto-size" path -- it costs
 * one extra round-trip into the renderer vs. passing explicit dimensions,
 * so prefer explicit width/height (e.g. from a chosen output preset) when
 * you have them.
 */
export const renderAutoSized = async (
  template: CompiledTemplate,
  options?: RenderOptions,
  signal?: AbortSignal
): Promise<RenderOutput> => {
  const measured = await measureTemplate(template, options, signal);
  return renderToPixels(
    template,
    { height: Math.ceil(measured.height), width: Math.ceil(measured.width) },
    options,
    signal
  );
};
