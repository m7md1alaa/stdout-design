import { logDebug } from "../shared/logger.js";
import type { CompiledTemplate } from "./render.js";
import type {
  Font,
  MeasuredNode,
  RenderOptions,
  Renderer,
} from "./takumi-types-shim.js";
import { Renderer as RendererImpl } from "./takumi-types-shim.js";

/**
 * Renderer lifecycle -- v2.
 *
 * v1 kept a single Renderer instance and rebuilt it whenever
 * font/persistent-image config changed, because fonts and images were
 * construction-time state (`new Renderer({ fonts, persistentImages })`).
 * That reconfigure-on-drift mechanism required every caller to pass the
 * current config on every call so drift could be detected -- and in the
 * shipped v1 code, `renderToPixels`/`measureTemplate` never actually did
 * that (both called `getRenderer()` with no arguments), so config changes
 * silently never took effect.
 *
 * v2 removes the problem at the source: `new Renderer()` takes no
 * arguments at all. Fonts are now a per-render option
 * (`render(node, { fonts })`), so there is nothing renderer-construction-
 * time to drift out of sync with `studio.config.ts` in the first place.
 * The singleton below exists purely to reuse the renderer's internal font
 * cache/thread pool across calls, per Takumi's own performance guidance --
 * it carries no configuration state to go stale.
 */

let activeRenderer: Renderer | null = null;

const __getRendererForTesting = (): Renderer => {
  if (!activeRenderer) {
    activeRenderer = new RendererImpl();
  }
  return activeRenderer;
};

/** Forces the next render/measure call to construct a fresh renderer instance. */
export const __resetRendererForTesting = (): void => {
  activeRenderer = null;
};

/**
 * Preload a font once and reuse it across many renders without re-passing
 * its bytes on every call. Optional -- per Takumi's v2 guidance, passing
 * `fonts` directly in a render/measure call's options covers most cases.
 */
export const registerFont = (
  font: Font,
  signal?: AbortSignal
): Promise<string[]> => __getRendererForTesting().registerFont(font, signal);

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
 * dimensions it used, so auto-sized output isn't supported by this
 * wrapper. Callers that need auto-sizing must call `measureTemplate` first
 * and pass the resulting width/height through explicitly (see
 * `renderAutoSized` below).
 *
 * Any `fonts`/`fontFamilies`/`images` the template needs must be supplied
 * via `options` -- there is no construction-time renderer config to fall
 * back on in v2.
 */
export const renderToPixels = async (
  template: CompiledTemplate,
  dimensions: { width: number; height: number },
  options?: Omit<RenderOptions, "width" | "height">,
  signal?: AbortSignal
): Promise<RenderOutput> => {
  const renderer = __getRendererForTesting();

  logDebug("renderer.render start", {
    fontFamilies: options?.fontFamilies,
    fonts: options?.fonts
      ?.filter((f) => typeof f === "object" && "name" in f)
      .map((f) => ({
        dataType: typeof (f as { data: unknown }).data,
        name: (f as { name?: string }).name,
      })),
    fontsCount: options?.fonts?.length ?? 0,
    lang: options?.lang,
  });

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
  const renderer = __getRendererForTesting();

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

export { __getRendererForTesting };
