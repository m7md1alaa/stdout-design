export const ErrorCode = {
  API_ERROR: "API_ERROR",
  CACHE_CLEANUP_FAILED: "CACHE_CLEANUP_FAILED",
  CACHE_CORRUPT_ENTRY: "CACHE_CORRUPT_ENTRY",
  CACHE_INIT_FAILED: "CACHE_INIT_FAILED",
  CACHE_WRITE_FAILED: "CACHE_WRITE_FAILED",
  CONFIG_INVALID: "CONFIG_INVALID",
  CONFIG_NOT_FOUND: "CONFIG_NOT_FOUND",
  INTERNAL_ERROR: "INTERNAL_ERROR",
  LOCALE_LOAD_FAILED: "LOCALE_LOAD_FAILED",
  PROP_VALIDATION_FAILED: "PROP_VALIDATION_FAILED",
  RENDERER_NOT_INITIALIZED: "RENDERER_NOT_INITIALIZED",
  RENDER_FAILED: "RENDER_FAILED",
  SSE_ERROR: "SSE_ERROR",
  TEMPLATE_INVALID_EXPORT: "TEMPLATE_INVALID_EXPORT",
  TEMPLATE_LOAD_FAILED: "TEMPLATE_LOAD_FAILED",
  TEMPLATE_NOT_FOUND: "TEMPLATE_NOT_FOUND",
  UI_RENDER_ERROR: "UI_RENDER_ERROR",
} as const;

export type ErrorCode = (typeof ErrorCode)[keyof typeof ErrorCode];

export class AppError extends Error {
  public readonly code: ErrorCode;
  public readonly context: Record<string, unknown>;

  constructor(
    code: ErrorCode,
    message: string,
    context?: Record<string, unknown>
  ) {
    super(message);
    this.name = "AppError";
    this.code = code;
    this.context = context ?? {};
  }
}
