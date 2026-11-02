import type { CSSProperties } from "react";

import type { RenderContext } from "./render-context.js";

/**
 * Small pieces every poster template ends up writing. Glyphs are drawn,
 * not typed: display faces rarely ship arrows or sparkles, and a missing
 * glyph renders as tofu.
 */

export interface Keyed<T> {
  key: string;
  value: T;
  index: number;
}

/**
 * Pairs each item with a React key that stays unique when items repeat
 * (two "Stickers" cells), without falling back to the bare index.
 */
export const keyed = <T,>(
  items: readonly T[],
  keyOf: (item: T) => string = String
): Keyed<T>[] => {
  const seen = new Map<string, number>();
  return items.map((value, index) => {
    const base = keyOf(value);
    const count = (seen.get(base) ?? 0) + 1;
    seen.set(base, count);
    return { index, key: count === 1 ? base : `${base}#${count}`, value };
  });
};

const WHITESPACE = /\s+/u;

/** The words of a line, for headlines set one word per line. */
export const words = (text: string): string[] =>
  text.split(WHITESPACE).filter(Boolean);

/**
 * Star polygon points in a 100×100 viewBox: `spikes` points, alternating
 * between the `outer` and `inner` radius. Use as `<polygon points={…} />`.
 */
export const starburst = (
  spikes: number,
  outer: number,
  inner: number
): string =>
  Array.from({ length: spikes * 2 }, (_, index) => {
    const radius = index % 2 === 0 ? outer : inner;
    const angle = (Math.PI * index) / spikes - Math.PI / 2;
    return `${50 + radius * Math.cos(angle)},${50 + radius * Math.sin(angle)}`;
  }).join(" ");

/** A print-style dot screen as a background: dots of `color` on a `spacing` px grid. */
export const halftone = ({
  color,
  spacing,
  dot = 0.3,
}: {
  color: string;
  spacing: number;
  /** Dot radius as a share of the cell. @default 0.3 */
  dot?: number;
}): CSSProperties => {
  const edge = Math.round(dot * 100);
  return {
    backgroundImage: `radial-gradient(${color} ${edge}%, transparent ${edge + 2}%)`,
    backgroundSize: `${spacing}px ${spacing}px`,
  };
};

/** A forward arrow: points right in left-to-right renders and left in right-to-left ones. */
export const Arrow = ({
  ctx,
  color,
  size = 22,
  strokeWidth = 3,
}: {
  /** The render context, or anything with its `flip`. */
  ctx: Pick<RenderContext, "flip">;
  color: string;
  size?: number;
  strokeWidth?: number;
}) => (
  <svg
    fill="none"
    height={size}
    style={{ transform: `scaleX(${ctx.flip(1)})` }}
    viewBox="0 0 24 24"
    width={size}
  >
    <path
      d="M4 12h15M13 5l7 7-7 7"
      stroke={color}
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={strokeWidth}
    />
  </svg>
);

/** A four-point sparkle. */
export const Sparkle = ({
  color,
  size = 16,
}: {
  color: string;
  size?: number;
}) => (
  <svg height={size} viewBox="0 0 24 24" width={size}>
    <path d="M12 0 15 9 24 12 15 15 12 24 9 15 0 12 9 9Z" fill={color} />
  </svg>
);
