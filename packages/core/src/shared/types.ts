import type { EmojiType } from "@takumi-rs/helpers/emoji";
import type { z } from "zod";

/** Fetch policy for remote images and emoji -- see docs/adr/0018-image-emoji-resolution-module.md. */
export interface ImagePolicy {
  /** Return true to permit fetching a URL. Unset denies every URL -- see assets/image-resolver.ts. */
  allowUrl?: (url: string) => boolean;
  /** Reject a fetched body past this size, by content-length or streamed. @default 32 MiB (the library default) */
  maxBytes?: number;
  /** Abort a fetch after this many milliseconds. @default 5000 (the library default) */
  timeout?: number;
  /** Custom fetch implementation. @default globalThis.fetch */
  fetch?: typeof globalThis.fetch;
  /**
   * Emoji provider. `"from-font"` skips network extraction entirely and
   * relies on a registered COLR font to supply emoji glyphs directly.
   * Unset also skips extraction (emoji render as whatever glyph the
   * fallback font stack provides, typically monochrome or missing).
   */
  emoji?: EmojiType | "from-font";
}

export interface FontConfig {
  family: string;
  weights?: number[];
  source?: "google" | "local";
  path?: string;
}

interface TemplateEntry {
  componentPath: string;
  description?: string;
}

export interface Preset {
  id: string;
  width: number;
  height: number;
  platform: string;
  deprecated?: boolean;
}

export interface StudioConfig {
  templates: Record<string, TemplateEntry>;
  presets: Preset[];
  defaultPreset?: string;
  locales?: string[];
  outDir?: string;
  scaffoldVersion?: string;
  fonts?: Record<string, FontConfig[]>;
  /**
   * Fetch policy for external images/emoji any template's node tree may
   * reference. This is the ONLY place `allowUrl` should be configured --
   * never accept it from request props or template code. Unset denies
   * every URL. See ADR-0018 and `assets/image-resolver.ts`.
   */
  images?: ImagePolicy;
}

export interface TemplateModule {
  default: (props: Record<string, unknown>) => unknown;
  propsSchema: z.ZodObject<Record<string, z.ZodTypeAny>>;
}
