import type { RenderCache } from "../cache/render-cache.js";
import type { CompiledTemplate } from "../engine/render.js";
import type { RenderOptions } from "../engine/takumi-types-shim.js";

type OutputFormat = "webp" | "png" | "jpeg" | "ico" | "raw";

export interface RenderOneInput {
  compiledTemplate: CompiledTemplate;
  templateId: string;
  contentHash: string;
  props: Record<string, unknown>;
  width: number;
  height: number;
  locale?: string;
  format?: OutputFormat;
  cache: RenderCache;
  outDir: string;
  filename: string;
  signal?: AbortSignal;
  renderOptions?: Pick<RenderOptions, "fonts" | "fontFamilies" | "lang"> &
    Record<string, unknown>;
}

export interface RenderOneOutput {
  outputPath: string;
  cacheHit: boolean;
  durationMs: number;
}
