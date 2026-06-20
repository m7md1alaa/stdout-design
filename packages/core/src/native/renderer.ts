import { Renderer } from "takumi-js/node";
import type {
  ConstructRendererOptions,
  MeasuredNode,
  RenderOptions,
} from "takumi-js/node";
import type { CompiledTemplate } from "../shared/render.js";

let globalRenderer: Renderer | null = null;

export const getRenderer = (config?: ConstructRendererOptions): Renderer => {
  if (globalRenderer) {
    return globalRenderer;
  }

  globalRenderer = new Renderer({
    fonts: config?.fonts,
    loadDefaultFonts: config?.loadDefaultFonts ?? (config?.fonts?.length ? false : undefined),
  });

  return globalRenderer;
};

export const resetRenderer = (): void => {
  globalRenderer = null;
};

export interface RenderOutput {
  bytes: Buffer;
  height: number;
  width: number;
}

export const renderToPixels = async (
  template: CompiledTemplate,
  options?: RenderOptions,
  signal?: AbortSignal,
): Promise<RenderOutput> => {
  const renderer = getRenderer();
  const bytes = await renderer.render(template.node, {
    ...options,
    stylesheets: [...(options?.stylesheets ?? []), ...template.stylesheets],
  }, signal);

  return {
    bytes,
    height: options?.height ?? 0,
    width: options?.width ?? 0,
  };
};

export const measureTemplate = (
  template: CompiledTemplate,
  options?: RenderOptions,
  signal?: AbortSignal,
): Promise<MeasuredNode> => {
  const renderer = getRenderer();

  return renderer.measure(template.node, {
    ...options,
    stylesheets: [...(options?.stylesheets ?? []), ...template.stylesheets],
  }, signal);
};
