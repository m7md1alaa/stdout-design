export type { StudioConfig, TemplateEntry, Preset } from "./shared/types.js";

export { compileTemplate } from "./shared/render.js";
export type { CompiledTemplate } from "./shared/render.js";

export { RenderCache } from "./node/render-cache.js";
export type {
  StageAKeyInput,
  StageBKeyInput,
  CacheStats,
} from "./node/render-cache.js";

export { defineSchema, validateProps } from "./shared/validation.js";
export type { PropSchema } from "./shared/validation.js";

export {
  getRenderer,
  resetRenderer,
  renderToPixels,
  measureTemplate,
} from "./node/renderer.js";
export type { RenderOutput } from "./node/renderer.js";
