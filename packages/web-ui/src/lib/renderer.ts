import type { TranslationPaths } from "./locale-layer";

export interface ValidationIssue {
  path: string;
  message: string;
  code?: string;
}

type RenderResult =
  | { ok: true; blob: Blob }
  | { ok: false; error: string; issues?: ValidationIssue[] };

export interface RenderOptions {
  autoDetected?: boolean;
  locale?: string;
  /** This locale's own text by prop path, laid over its locale file (ADR-0021). */
  localeOverrides?: TranslationPaths;
  preset?: string;
  signal?: AbortSignal;
}

export interface RenderAdapter {
  render: (
    templateId: string,
    props: Record<string, unknown>,
    options?: RenderOptions
  ) => Promise<RenderResult>;
}

export interface RenderContext {
  autoDetected: boolean;
  locale: string | null;
  localeOverrides?: TranslationPaths;
  preset: string;
  signal?: AbortSignal;
}

/**
 * Builds a `RenderAdapter.render` options object from render context. The
 * one place both the export flow and the live preview go through, so a new
 * option is added in one place instead of independently at each call site.
 */
export const buildRenderOptions = (ctx: RenderContext): RenderOptions => ({
  autoDetected: ctx.autoDetected,
  locale: ctx.locale ?? undefined,
  localeOverrides: ctx.localeOverrides,
  preset: ctx.preset,
  signal: ctx.signal,
});
