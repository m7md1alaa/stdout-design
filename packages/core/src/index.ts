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
  StageAKeyInput,
  StageBKeyInput,
  CacheStats,
} from "./node/render-cache.js";

// Consolidated: this now resolves to the file that carries the structured
// PropValidationError/PropValidationIssue contract. There is only one
// validation implementation in the package -- the old schema.parse()-based
// one (which threw raw, unshaped ZodErrors) has been deleted, not kept
// alongside this as a second path.
export {
  defineSchema,
  validateProps,
  PropValidationError,
  isZodObject,
  zodToJsonSchemaShape,
} from "./shared/validation.js";
export type { PropSchema, PropValidationIssue } from "./shared/validation.js";

export {
  getRenderer,
  resetRenderer,
  registerFont,
  renderToPixels,
  measureTemplate,
  renderAutoSized,
} from "./node/renderer.js";
export type { RenderOutput } from "./node/renderer.js";

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
  loadConfig,
  loadTemplate,
  parseDataFile,
  resolveLocales,
} from "./batch/loaders.js";
export type { LoadedTemplate } from "./batch/loaders.js";
