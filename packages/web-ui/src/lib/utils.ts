import { clsx } from "clsx";
import type { ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export const cn = (...inputs: ClassValue[]) => twMerge(clsx(inputs));

export const setNestedValue = <T extends Record<string, unknown>>(
  obj: T,
  path: string,
  value: unknown
): T => {
  const parts = path.split(".");
  if (parts.length === 1) {
    return { ...obj, [path]: value };
  }

  const [head, ...rest] = parts as [string, ...string[]];
  const nestedValue = setNestedValue(
    (obj[head] as Record<string, unknown>) ?? ({} as Record<string, unknown>),
    rest.join("."),
    value
  );
  return { ...obj, [head]: nestedValue };
};

const ARABIC_RANGE = /[\u0600-\u06FF]/u;

export const hasArabicChars = (
  value: unknown
): boolean => {
  if (typeof value === "string") {
    return ARABIC_RANGE.test(value);
  }
  if (Array.isArray(value)) {
    return value.some((item) => hasArabicChars(item));
  }
  if (typeof value === "object" && value !== null) {
    return Object.values(value).some((item) => hasArabicChars(item));
  }
  return false;
};
