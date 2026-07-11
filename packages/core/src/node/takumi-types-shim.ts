/**
 * Type-only shim for `@takumi-rs/core` (as re-exported by `takumi-js/node`).
 *
 * Migrated for Takumi v2. The v1 shim existed to work around a broken
 * `export.d.ts` re-export chain in @takumi-rs/core@1.8.6 that hid
 * `render`/`measure` and several option types from consumers on
 * `moduleResolution: "nodenext"`. This file re-declares the v2 surface we
 * actually use, backed by the real runtime export.
 *
 * TODO(verify-on-upgrade): the v1 packaging bug this shim worked around
 * has not been independently re-verified against the v2 release actually
 * installed. Once upgraded, run the same isolated-probe check described
 * in the v1 version of this file (import the types directly from
 * "takumi-js/node" in a throwaway file and see if `render`/`measure`/
 * `registerFont` resolve). If they do, delete this file and switch all
 * importers back to `takumi-js/node` directly. Tracked against the
 * upstream repo: https://github.com/kane50613/takumi
 *
 * v2 breaking changes reflected below (see /docs/upgrade/v2):
 * - `new Renderer(options)` -> `new Renderer()`. The constructor takes no
 *   arguments; fonts and images are now per-render options instead of
 *   construction-time state.
 * - `loadFont` / `loadFonts` / `loadFontSync` -> `registerFont`. Use this
 *   only to preload a font once and reuse it across many renders; most
 *   callers should just pass `fonts` on the render/measure call instead.
 * - The persistent image store and `GlobalContext` are gone.
 *   `putPersistentImage` / `clearImageStore` no longer exist. Every image
 *   a render needs must be passed through `images`, keyed by `src`.
 * - `fetchedResources` -> `images`. `images` also accepts a group form
 *   (`{ sources, fetch, fetchCache }`) that combines pre-fetched entries,
 *   a custom fetch implementation, and a shared byte cache.
 * - `format` stays a string, but `quality` (jpeg / lossy webp) and
 *   `lossless` (webp) are now separate optional fields instead of one
 *   combined quality argument.
 * - `fonts` entries may be bare URL strings, fetched and cached on demand,
 *   in addition to loaded font descriptors / raw bytes.
 */

import { Renderer as RuntimeRenderer } from "takumi-js/node";

export interface FontDescriptor {
  name?: string;
  data:
    | Uint8Array
    | ArrayBuffer
    | Buffer
    | (() => Promise<ArrayBuffer | Uint8Array>);
  weight?: number;
  style?:
    | "normal"
    | "italic"
    | "oblique"
    | `oblique ${number}deg`
    // oxlint-disable-next-line typescript/ban-types
    | (string & {});
}

/** A font supplied to a render/measure call: a loaded descriptor, raw bytes, or a bare URL fetched on demand. */
export type Font = FontDescriptor | Uint8Array | ArrayBuffer | Buffer | string;

interface ImageSourceEntry {
  src: string;
  data: Uint8Array | ArrayBuffer;
}

/** Shared byte cache across renders -- dedupes concurrent fetches of the same URL. */
type ImageFetchCache = Map<string, Promise<ArrayBuffer>>;

type ImageFetchFn = (url: string, signal?: AbortSignal) => Promise<ArrayBuffer>;

interface ImageResourcesGroup {
  /** Pre-fetched entries, keyed by src. Not re-fetched. */
  sources?: ImageSourceEntry[];
  fetch?: ImageFetchFn;
  timeout?: number;
  fetchCache?: ImageFetchCache;
}

/** Either a flat list of pre-fetched images, or the group form with fetch behavior + a shared cache. */
type ImagesOption = ImageSourceEntry[] | ImageResourcesGroup;

type OutputFormat = "webp" | "png" | "jpeg" | "ico" | "raw";
type DitheringAlgorithm = "none" | "ordered-bayer" | "floyd-steinberg";

export interface RenderOptions {
  width?: number;
  height?: number;
  format?: OutputFormat;
  /** JPEG and lossy WebP only. */
  quality?: number;
  /** WebP only (napi binding). Ignored on wasm, where WebP is always lossless. */
  lossless?: boolean;
  drawDebugBorder?: boolean;

  images?: ImagesOption;
  /** Fonts needed for this render. Descriptors, raw bytes, or bare URLs. */
  fonts?: Font[];
  /** Ordered fallback chain of family names. Defaults to every registered family in registration order. */
  fontFamilies?: string[];
  /** BCP-47 language tag for locale-aware shaping. Inherited by children. */
  lang?: string;
  stylesheets?: string[];
  devicePixelRatio?: number;
  timeMs?: number;
  dithering?: DitheringAlgorithm;
}

interface MeasuredTextRun {
  text: string;
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface MeasuredNode {
  width: number;
  height: number;
  transform: [number, number, number, number, number, number];
  children: MeasuredNode[];
  runs: MeasuredTextRun[];
}

/**
 * Re-typed view of the runtime Renderer class for v2. The constructor and
 * methods are the real implementation (imported as a value below) -- only
 * the *type* is being declared here.
 */
export interface Renderer {
  /**
   * Preload a font once and reuse it across many renders. Resolves to the
   * family name(s) the font produced. Most callers don't need this --
   * passing `fonts` directly on `render`/`measure` covers the common case.
   */
  registerFont: (font: Font, signal?: AbortSignal) => Promise<string[]>;
  render: (
    source: unknown,
    options?: RenderOptions,
    signal?: AbortSignal
  ) => Promise<Buffer>;
  measure: (
    source: unknown,
    options?: RenderOptions,
    signal?: AbortSignal
  ) => Promise<MeasuredNode>;
}

/** v2: the constructor takes no arguments. Fonts/images are per-render options now. */
type RendererConstructor = new () => Renderer;

// Cast through `unknown` rather than asserting the runtime class directly
// implements `RendererConstructor` -- see the file header TODO for why
// this indirection is still here post-upgrade.
export const Renderer = RuntimeRenderer as unknown as RendererConstructor;
