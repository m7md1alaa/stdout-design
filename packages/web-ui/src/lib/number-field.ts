/** Step for fractional values when the schema does not say otherwise. */
const FRACTIONAL_STEP = 0.01;

const isWhole = (value: unknown): boolean =>
  value === undefined || Number.isInteger(value);

/**
 * The step a number field moves by. The schema's `multipleOf` wins, then
 * `integer` means 1. A plain `number` is whole-step only when its bounds and
 * default are whole and the range is wider than 1; a 0..1 range is a ratio,
 * and a default like 0.5 says the field holds fractions.
 */
export const resolveNumberStep = (schema: Record<string, unknown>): number => {
  const { multipleOf, type, minimum, maximum } = schema;

  if (typeof multipleOf === "number" && multipleOf > 0) {
    return multipleOf;
  }
  if (type === "integer") {
    return 1;
  }

  const wholeBounds =
    isWhole(minimum) && isWhole(maximum) && isWhole(schema.default);
  const wideRange =
    typeof minimum !== "number" ||
    typeof maximum !== "number" ||
    maximum - minimum > 1;

  return wholeBounds && wideRange ? 1 : FRACTIONAL_STEP;
};

/** Parses what the user typed. `null` for empty or non-numeric input. */
export const parseNumberInput = (raw: string): number | null => {
  const trimmed = raw.trim();
  if (trimmed.length === 0) {
    return null;
  }
  const value = Number(trimmed);
  return Number.isFinite(value) ? value : null;
};

interface NumberBounds {
  minimum?: unknown;
  maximum?: unknown;
}

export const isWithinBounds = (
  value: number,
  { minimum, maximum }: NumberBounds
): boolean =>
  !(typeof minimum === "number" && value < minimum) &&
  !(typeof maximum === "number" && value > maximum);

export const clampToBounds = (
  value: number,
  { minimum, maximum }: NumberBounds
): number => {
  const atLeastMin =
    typeof minimum === "number" ? Math.max(value, minimum) : value;
  return typeof maximum === "number"
    ? Math.min(atLeastMin, maximum)
    : atLeastMin;
};

/** Pixels of horizontal drag per step when scrubbing a value by its label. */
const SCRUB_PIXELS_PER_STEP = 4;

const decimalsOf = (step: number): number => {
  const [, fraction = ""] = String(step).split(".");
  return fraction.length;
};

/**
 * The value after dragging `deltaX` pixels from `start`: one step per few
 * pixels, kept inside the schema's bounds and free of float noise.
 */
export const scrubValue = (
  start: number,
  deltaX: number,
  step: number,
  bounds: NumberBounds
): number => {
  const steps = Math.trunc(deltaX / SCRUB_PIXELS_PER_STEP);
  const raw = Number((start + steps * step).toFixed(decimalsOf(step)));
  return clampToBounds(raw, bounds);
};
