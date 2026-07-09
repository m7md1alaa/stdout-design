export type { StudioConfig, TemplateEntry, Preset } from "./shared/types.js";

export { compileTemplate } from "./shared/render.js";
export type { CompiledTemplate } from "./shared/render.js";

export { ErrorCode, AppError } from "./shared/error-codes.js";
export type { ErrorCode as ErrorCodeType } from "./shared/error-codes.js";

export { logDebug, logInfo, logWarn, logError } from "./shared/logger.js";
export type { LogLevel } from "./shared/logger.js";

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
