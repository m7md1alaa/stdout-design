export type {
  StudioConfig,
  TemplateEntry,
  Preset,
  TemplateModule,
} from "./shared/types.js";

export {
  parseStudioConfig,
  studioConfigSchema,
} from "./shared/config-schema.js";

export { compileTemplate } from "./engine/render.js";
export type { CompiledTemplate } from "./engine/render.js";

export { ErrorCode, AppError } from "./shared/error-codes.js";
export type { ErrorCode as ErrorCodeType } from "./shared/error-codes.js";

export { logDebug, logInfo, logWarn, logError } from "./shared/logger.js";
export type { LogLevel } from "./shared/logger.js";

export { RenderCache } from "./cache/render-cache.js";
export type {
  CompileCacheKeyInput,
  PixelCacheKeyInput,
  CacheStats,
  RenderCacheOptions,
} from "./cache/render-cache.js";

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
} from "./engine/renderer.js";
export type { RenderOutput } from "./engine/renderer.js";
export type { Font, RenderOptions } from "./engine/takumi-types-shim.js";

export { expandMatrix } from "./batch/matrix.js";
export type { MatrixInput, DataRow } from "./batch/matrix.js";

export { renderOne } from "./orchestrate/render-one.js";
export type { RenderOneInput, RenderOneOutput } from "./orchestrate/types.js";

export { generateOutputFilename } from "./batch/naming.js";
export type { NamingOptions } from "./batch/naming.js";

export { writeManifest } from "./batch/manifest.js";
export type { Manifest, ManifestEntry } from "./batch/types.js";

export type { MatrixCell } from "./batch/types.js";

export { renderComponent } from "./orchestrate/single.js";
export type { SingleInput, SingleOutput } from "./orchestrate/single.js";

export {
  orchestrateRender,
  orchestrateMeasure,
} from "./orchestrate/orchestrate.js";
export type {
  OrchestrateRenderInput,
  OrchestrateRenderResult,
  OrchestrateMeasureInput,
  OrchestrateMeasureResult,
} from "./orchestrate/types.js";

export { runBatch } from "./batch/batch.js";
export type { BatchInput, BatchOutput } from "./batch/batch.js";

export { resolveProjectPaths } from "./project/project-paths.js";
export type { ProjectPaths } from "./project/project-paths.js";

export { openCache } from "./cache/open-cache.js";
export type { OpenCacheOptions } from "./cache/open-cache.js";

export { resolveAssetsForLocale } from "./assets/assets-resolver.js";
export type {
  AssetsForLocale,
  AssetsResolverOptions,
  FontResolutionResult,
} from "./assets/assets-resolver.js";

export { mergeLocaleProps } from "./assets/merge-locale-props.js";

export { defaultFetchFonts } from "./assets/default-fonts.js";

export { classifyLocale } from "./assets/classify-locale.js";
export type { LocaleClassification } from "./assets/classify-locale.js";

export {
  importTemplateForBatch,
  loadConfig,
  parseDataFile,
  resolveLocales,
} from "./batch/loaders.js";
export type { LoadedTemplate } from "./batch/loaders.js";
