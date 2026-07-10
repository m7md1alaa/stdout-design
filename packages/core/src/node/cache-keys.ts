import { createHash } from "node:crypto";

/**
 * Cache key derivation, shared by every component that needs to name a
 * cache entry consistently. Pulled out of the old monolithic RenderCache
 * specifically so StageACache, MetadataStore, and FsStore all derive keys
 * the same way -- a duplicated hashing implementation across components
 * is exactly the kind of drift risk this split is meant to eliminate.
 */

export interface StageAKeyInput {
  templateId: string;
  templateContentHash: string;
  propsJSON: string;
}

export interface StageBKeyInput {
  templateContentHash: string;
  propsJSON: string;
  width: number;
  height: number;
  format?: string;
}

export const createStageAKey = (input: StageAKeyInput): string =>
  createHash("sha256")
    .update(
      `${input.templateId}\u0000${input.templateContentHash}\u0000${input.propsJSON}`
    )
    .digest("hex")
    .slice(0, 16);

export const createStageBKey = (input: StageBKeyInput): string =>
  createHash("sha256")
    .update(
      `${input.templateContentHash}\u0000${
        input.propsJSON
      }\u0000${input.width}x${input.height}\u0000${input.format ?? "png"}`
    )
    .digest("hex")
    .slice(0, 32);
