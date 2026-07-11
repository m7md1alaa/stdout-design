export type {
  StudioConfig,
  TemplateEntry,
  Preset,
  TemplateModule,
} from "./shared/types.js";

export { studioConfigSchema } from "./shared/config-schema.js";

export { compileTemplate } from "./shared/render.js";
export type { CompiledTemplate } from "./shared/render.js";

export { ErrorCode, AppError } from "./shared/error-codes.js";
export type { ErrorCode as ErrorCodeType } from "./shared/error-codes.js";

export { logDebug, logInfo, logWarn, logError } from "./shared/logger.js";
export type { LogLevel } from "./shared/logger.js";

export { RenderCache } from "./node/render-cache.js";
export type {
  CompileCacheKeyInput,
  PixelCacheKeyInput,
  CacheStats,
  RenderCacheOptions,
} from "./node/render-cache.js";

export {
  validateProps,
  PropValidationError,
  isZodObject,
  zodToJsonSchemaShape,
} from "./shared/validation.js";
export type { PropValidationIssue } from "./shared/validation.js";

export {
  registerFont,
  renderToPixels,
  measureTemplate,
  renderAutoSized,
} from "./node/renderer.js";
export type { RenderOutput } from "./node/renderer.js";
export type { Font, RenderOptions } from "./node/takumi-types-shim.js";

export { expandMatrix } from "./batch/matrix.js";
export type {
  MatrixInput,
  MatrixLocaleInput,
  DataRow,
} from "./batch/matrix.js";

export { renderOne } from "./batch/render-one.js";
export type { RenderOneInput, RenderOneOutput } from "./batch/types.js";

export { generateOutputFilename } from "./batch/naming.js";
export type { NamingOptions } from "./batch/naming.js";

export { writeManifest } from "./batch/manifest.js";
export type { Manifest, ManifestEntry } from "./batch/types.js";

export type { MatrixCell } from "./batch/types.js";

export { renderComponent } from "./batch/single.js";
export type { SingleInput, SingleOutput } from "./batch/single.js";

export { runBatch } from "./batch/batch.js";
export type { BatchInput, BatchOutput } from "./batch/batch.js";

export {
  importTemplateForBatch,
  loadConfig,
  parseDataFile,
  resolveLocales,
} from "./batch/loaders.js";
export type { LoadedTemplate } from "./batch/loaders.js";
