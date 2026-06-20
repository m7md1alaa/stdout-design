export type { StudioConfig, TemplateEntry, Preset } from "./shared/types.js";

export { compileTemplate } from "./shared/render.js";
export type { CompiledTemplate } from "./shared/render.js";

export { createStageAKey } from "./shared/cache.js";
export type { StageAKeyInput } from "./shared/cache.js";

export { defineSchema, validateProps } from "./shared/validation.js";
export type { PropSchema } from "./shared/validation.js";

export { getRenderer, resetRenderer, renderToPixels, measureTemplate } from "./native/renderer.js";
export type { RenderOutput } from "./native/renderer.js";
