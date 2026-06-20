/**
 * Type-only shim for `@takumi-rs/core` (as re-exported by `takumi-js/node`).
 *
 * WORKAROUND, NOT A DESIGN CHOICE: as of @takumi-rs/core@1.8.6, the
 * package's shipped `dist/export.d.ts` does:
 *
 *   export type * from "../index";
 *   import { Renderer as NativeRenderer } from "../index";
 *   export declare class Renderer extends NativeRenderer { ...added methods... }
 *
 * Verified directly against the installed package: this re-export pattern
 * does not surface `NativeRenderer`'s `render`/`measure` methods on the
 * derived `Renderer` class's public type, and `RenderOptions`,
 * `MeasuredNode`, and `ConstructRendererOptions` are not resolvable via
 * `import type { ... } from "takumi-js/node"` or
 * `import type { ... } from "@takumi-rs/core"` -- both fail to find those
 * members under `moduleResolution: "nodenext"`, despite `index.d.ts`
 * declaring them. This reproduces with a minimal, isolated probe file, so
 * it is a real packaging issue, not a misuse on our side.
 *
 * This file re-declares the subset of the surface we actually use, backed
 * by the real runtime export (the class itself imports and constructs
 * fine -- only the *type* re-export chain is broken). Everything in
 * `packages/core` should import `Renderer` and these types from this file,
 * not directly from `takumi-js/node`.
 *
 * TODO(remove-when-fixed): once a future @takumi-rs/core release fixes the
 * `export.d.ts` re-export chain, delete this file and switch all importers
 * back to `takumi-js/node` directly. Tracked against the upstream repo:
 * https://github.com/kane50613/takumi
 */

import { Renderer as RuntimeRenderer } from "takumi-js/node";

export interface Font {
  name?: string;
  data: Uint8Array | ArrayBuffer | Buffer;
  weight?: number;
  style?:
    | "normal"
    | "italic"
    | "oblique"
    | `oblique ${number}deg`
    // oxlint-disable-next-line typescript/ban-types
    | (string & {});
}

export interface ImageSource {
  src: string;
  data: Uint8Array | ArrayBuffer;
}

export interface ConstructRendererOptions {
  persistentImages?: ImageSource[];
  fonts?: Font[];
  loadDefaultFonts?: boolean;
}

export type OutputFormat = "webp" | "png" | "jpeg" | "ico" | "raw";
export type DitheringAlgorithm = "none" | "ordered-bayer" | "floyd-steinberg";

export interface RenderOptions {
  width?: number;
  height?: number;
  format?: OutputFormat;
  quality?: number;
  drawDebugBorder?: boolean;
  fetchedResources?: ImageSource[];
  stylesheets?: string[];
  devicePixelRatio?: number;
  timeMs?: number;
  dithering?: DitheringAlgorithm;
}

export interface MeasuredTextRun {
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
 * Re-typed view of the runtime Renderer class. The constructor and methods
 * are the real implementation (imported as a value below) -- only the
 * *type* of `render`/`measure` is being restored here, since those exist
 * and work at runtime; the published types just don't expose them.
 */
export interface Renderer {
  putPersistentImage(source: ImageSource, signal?: AbortSignal): Promise<void>;
  loadFontSync(font: Font): void;
  loadFont(data: Font, signal?: AbortSignal): Promise<number>;
  loadFonts(fonts: Font[], signal?: AbortSignal): Promise<number>;
  clearImageStore(): void;
  render(
    source: unknown,
    options?: RenderOptions,
    signal?: AbortSignal
  ): Promise<Buffer>;
  measure(
    source: unknown,
    options?: RenderOptions,
    signal?: AbortSignal
  ): Promise<MeasuredNode>;
}

export type RendererConstructor = new (
  options?: ConstructRendererOptions | null
) => Renderer;

// Cast through `unknown` rather than asserting the runtime class directly
// implements `RendererConstructor`, since the runtime class's *declared*
// type is the broken one we're working around -- we know from the
// package's source (and from constructing/calling it) that the actual
// runtime behavior matches the interface above.
export const Renderer = RuntimeRenderer as unknown as RendererConstructor;
