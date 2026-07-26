import { createHash } from "node:crypto";

/**
 * Cache key derivation, shared by every component that needs to name a
 * cache entry consistently. Pulled out of the old monolithic RenderCache
 * specifically so CompileCache, MetadataStore, and FsStore all derive keys
 * the same way -- a duplicated hashing implementation across components
 * is exactly the kind of drift risk this split is meant to eliminate.
 */

export interface CompileCacheKeyInput {
  templateId: string;
  templateContentHash: string;
  propsJSON: string;
}

export interface PixelCacheKeyInput {
  templateContentHash: string;
  propsJSON: string;
  width: number;
  height: number;
  format?: string;
}

export const createCompileCacheKey = (input: CompileCacheKeyInput): string =>
  createHash("sha256")
    .update(
      `${input.templateId}\u0000${input.templateContentHash}\u0000${input.propsJSON}`
    )
    .digest("hex")
    // 16 (64-bit collision space — marginal). 32 chars = 128 bits,
    // matching the pixel key and eliminating the asymmetry.
    .slice(0, 32);

export const createPixelCacheKey = (input: PixelCacheKeyInput): string =>
  createHash("sha256")
    .update(
      // `widthxheight` with no separator before format, ambiguous if
      // format starts with a digit. All fields now separated by \u0000.
      `${input.templateContentHash}\u0000${input.propsJSON}\u0000${
        input.width
      }\u0000${input.height}\u0000${input.format ?? "png"}`
    )
    .digest("hex")
    .slice(0, 32);
