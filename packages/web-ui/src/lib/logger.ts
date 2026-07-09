const timestamp = (): string => new Date().toISOString();

const stringifyContext = (
  context: Record<string, unknown> | undefined
): string => {
  if (!context || Object.keys(context).length === 0) {
    return "";
  }
  return ` ${JSON.stringify(context)}`;
};

export const logWarn = (
  message: string,
  context?: Record<string, unknown>
): void => {
  console.warn(`[${timestamp()}] WARN ${message}${stringifyContext(context)}`);
};

export const logError = (
  code: string,
  message: string,
  context?: Record<string, unknown>
): void => {
  console.error(
    `[${timestamp()}] ERROR [${code}] ${message}${stringifyContext(context)}`
  );
};
