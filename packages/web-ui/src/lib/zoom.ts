/** Zoom is either fitted to the available space or a fixed scale factor. */
export type Zoom = "fit" | number;

export const ZOOM_STEPS = [0.25, 0.5, 0.75, 1, 1.5, 2, 3, 4] as const;

const EPSILON = 0.001;

/** The largest scale at which the preset fits the space, never above 100%. */
export const fitScale = (
  available: { width: number; height: number },
  preset: { width: number; height: number }
): number => {
  if (available.width <= 0 || available.height <= 0) {
    return 1;
  }
  return Math.min(
    1,
    available.width / preset.width,
    available.height / preset.height
  );
};

/** The scale a zoom resolves to, given the current fit scale. */
export const resolveZoom = (zoom: Zoom, fit: number): number =>
  zoom === "fit" ? fit : zoom;

/**
 * The next fixed step above or below the current scale. From a fitted view
 * this steps relative to the fitted scale, so zooming in from 62% lands on
 * 75% rather than jumping past it.
 */
export const stepZoom = (
  current: number,
  direction: 1 | -1
): number | "limit" => {
  if (direction === 1) {
    const next = ZOOM_STEPS.find((step) => step > current + EPSILON);
    return next ?? "limit";
  }
  const lower = ZOOM_STEPS.filter((step) => step < current - EPSILON);
  return lower.at(-1) ?? "limit";
};

export const formatZoom = (scale: number): string =>
  `${Math.round(scale * 100)}%`;
