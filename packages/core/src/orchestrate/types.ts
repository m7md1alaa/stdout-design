import type { ComponentType } from "react";

import type { FontResolutionResult } from "../assets/assets-resolver.js";
import type { ImagePolicy } from "../assets/image-resolver.js";
import type { RenderCache } from "../cache/render-cache.js";
import type { CompiledTemplate } from "../engine/render.js";
import type { Font, RenderOptions } from "../engine/takumi-types-shim.js";
import type { PropSchema } from "../shared/validation.js";

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

export interface OrchestrateRenderInput {
  component?: ComponentType<Record<string, unknown>>;
  compiledTemplate?: CompiledTemplate;
  templateContentHash: string;
  templateId: string;
  props: Record<string, unknown>;
  propsSchema?: PropSchema;
  locale?: string;
  loadLocaleData?: (locale: string) => Promise<Record<string, unknown>>;
  fetchFonts?: (localeId: string) => Promise<FontResolutionResult | null>;
  fonts?: Font[];
  fontFamilies?: string[];
  /**
   * Fetch policy for external images/emoji this template's node tree
   * references. Source this from a trusted, non-request-influenced place
   * (studio.config.ts / OgResponseOptions) -- never from `props`. Unset
   * denies every URL (see ADR-0018 and `assets/image-resolver.ts`).
   */
  images?: ImagePolicy;
  width: number;
  height: number;
  cache: RenderCache;
  format?: OutputFormat;
  signal?: AbortSignal;
}

export interface OrchestrateRenderResult {
  bytes: Buffer;
  width: number;
  height: number;
  format: string;
  cacheHit: boolean;
  durationMs: number;
}

export interface OrchestrateMeasureInput {
  component?: ComponentType<Record<string, unknown>>;
  compiledTemplate?: CompiledTemplate;
  templateContentHash: string;
  templateId: string;
  props: Record<string, unknown>;
  propsSchema?: PropSchema;
  locale?: string;
  loadLocaleData?: (locale: string) => Promise<Record<string, unknown>>;
  fetchFonts?: (localeId: string) => Promise<FontResolutionResult | null>;
  /** See `OrchestrateRenderInput.images`. */
  images?: ImagePolicy;
  cache: RenderCache;
  signal?: AbortSignal;
}

export interface OrchestrateMeasureResult {
  width: number;
  height: number;
  durationMs: number;
}
