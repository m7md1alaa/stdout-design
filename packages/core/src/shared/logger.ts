import type { ErrorCode } from "./error-codes.js";

export type LogLevel = "debug" | "info" | "warn" | "error";

const timestamp = (): string => new Date().toISOString();

// Debug output is opt-in so normal CLI runs stay readable. All log lines go
// to stderr: stdout is reserved for command output (e.g. `render --json`).
const isDebugEnabled = (): boolean => {
  const flag = process.env.STUDIO_DEBUG ?? process.env.DEBUG ?? "";
  return flag === "1" || flag === "true" || flag.includes("studio");
};

const stringifyContext = (
  context: Record<string, unknown> | undefined
): string => {
  if (!context || Object.keys(context).length === 0) {
    return "";
  }
  return ` ${JSON.stringify(context)}`;
};

export const logDebug = (
  message: string,
  context?: Record<string, unknown>
): void => {
  if (!isDebugEnabled()) {
    return;
  }
  console.error(
    `[${timestamp()}] DEBUG ${message}${stringifyContext(context)}`
  );
};

export const logInfo = (
  message: string,
  context?: Record<string, unknown>
): void => {
  console.error(`[${timestamp()}] INFO ${message}${stringifyContext(context)}`);
};

export const logWarn = (
  message: string,
  context?: Record<string, unknown>
): void => {
  console.warn(`[${timestamp()}] WARN ${message}${stringifyContext(context)}`);
};

export const logError = (
  code: ErrorCode,
  message: string,
  context?: Record<string, unknown>
): void => {
  console.error(
    `[${timestamp()}] ERROR [${code}] ${message}${stringifyContext(context)}`
  );
};
