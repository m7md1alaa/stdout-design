export const mergeLocaleProps = (
  props: Record<string, unknown>,
  localeData?: Record<string, unknown>
): Record<string, unknown> => {
  if (!localeData) {
    return { ...props };
  }

  const merged = { ...props };
  for (const [key, value] of Object.entries(localeData)) {
    if (Array.isArray(value) && Array.isArray(merged[key])) {
      merged[key] = value;
    } else if (typeof value === "string" && typeof merged[key] === "string") {
      merged[key] = value;
    }
  }

  return merged;
};
