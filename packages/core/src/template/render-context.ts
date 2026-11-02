import type { CSSProperties } from "react";

import type { Direction, LocaleInfo, Script } from "../shared/locale.js";
import { fontStack } from "./fonts.js";
import type { FontRoles } from "./fonts.js";

export interface Canvas {
  width: number;
  height: number;
  aspect: "square" | "landscape" | "portrait";
}

/** A text style written for Latin; `ctx.type` adapts it to the render's script. */
export interface TypeSpec<R extends string = string> {
  /** Font size in px; scaled per script. Leave out for text sized elsewhere. */
  size?: number;
  /** Line height, unitless. */
  leading?: number;
  /** Letter spacing in em. */
  tracking?: number;
  italic?: boolean;
  uppercase?: boolean;
  weight?: number;
  /** Font role declared in the template's `fonts`. */
  font?: R;
  /**
   * Exact size or leading for one script, used as given instead of the
   * table's adjustment: for a face whose metrics the table doesn't suit,
   * e.g. `{ arabic: { leading: 1 } }` for a tall display face.
   */
  scripts?: Partial<Record<Script, { size?: number; leading?: number }>>;
}

/**
 * What the pipeline tells a template about the render it is part of
 * (ADR-0019). Built once per render by the orchestrator; never part of
 * props. For layout, prefer logical CSS properties (`insetInlineStart`,
 * `marginInlineEnd`, `borderInlineStart`): the root carries `dir`, so they
 * mirror on their own. `flip` covers what CSS doesn't mirror.
 */
export interface RenderContext<R extends string = string> {
  locale: LocaleInfo;
  dir: Direction;
  canvas: Canvas;
  /** CSS `font-family` value for each declared font role. */
  fonts: Readonly<Record<R, string>>;
  /** Mirrors a horizontal value (rotation angle, SVG x offset) for right-to-left renders. */
  flip: (value: number) => number;
  /**
   * A text style adapted to the script: see `SCRIPT_TYPOGRAPHY`. Declared
   * as a method so a context with named font roles still passes where a
   * plain `RenderContext` is expected.
   */
  // oxlint-disable-next-line method-signature-style -- bivariance is the point, see above
  type(spec: TypeSpec<R>): CSSProperties;
}

interface ScriptTypography {
  /** Multiplies the size: Arabic and Hebrew faces run large next to Latin display faces. */
  sizeScale: number;
  /** Lowest line height that keeps marks and ascenders from colliding. */
  minLeading: number;
  /** Whether letter spacing, italics, and uppercase mean anything in the script. */
  latinStyling: boolean;
}

/**
 * How a Latin text style changes per script. Arabic is cursive and Hebrew
 * has no case: neither takes letter spacing, italics, or uppercase, and
 * both need taller lines than Latin display type.
 */
export const SCRIPT_TYPOGRAPHY: Record<Script, ScriptTypography> = {
  arabic: { latinStyling: false, minLeading: 1.15, sizeScale: 0.88 },
  hebrew: { latinStyling: false, minLeading: 1.05, sizeScale: 0.94 },
  latin: { latinStyling: true, minLeading: 0, sizeScale: 1 },
};

const SQUARE_TOLERANCE = 0.05;

export const toCanvas = (width: number, height: number): Canvas => {
  const ratio = width / height;
  let aspect: Canvas["aspect"] = "square";
  if (ratio > 1 + SQUARE_TOLERANCE) {
    aspect = "landscape";
  } else if (ratio < 1 - SQUARE_TOLERANCE) {
    aspect = "portrait";
  }
  return { aspect, height, width };
};

export const createRenderContext = <R extends string>(input: {
  locale: LocaleInfo;
  canvas: Canvas;
  fonts: FontRoles<R>;
}): RenderContext<R> => {
  const { locale, canvas } = input;
  const fonts = Object.fromEntries(
    Object.entries(input.fonts).map(([role, definition]) => [
      role,
      fontStack(definition as FontRoles[string]),
    ])
  ) as Record<R, string>;
  const script = SCRIPT_TYPOGRAPHY[locale.script];
  const rtl = locale.dir === "rtl";

  return {
    canvas,
    dir: locale.dir,
    flip: (value) => (rtl && value !== 0 ? -value : value),
    fonts,
    locale,
    type: (spec) => {
      const style: CSSProperties = {};
      const exact = spec.scripts?.[locale.script];
      if (exact?.size !== undefined) {
        style.fontSize = exact.size;
      } else if (spec.size !== undefined) {
        style.fontSize = Math.round(spec.size * script.sizeScale);
      }
      if (exact?.leading !== undefined) {
        style.lineHeight = exact.leading;
      } else if (spec.leading !== undefined) {
        style.lineHeight = Math.max(spec.leading, script.minLeading);
      }
      if (spec.weight !== undefined) {
        style.fontWeight = spec.weight;
      }
      if (spec.font !== undefined) {
        style.fontFamily = fonts[spec.font];
      }
      if (script.latinStyling) {
        if (spec.tracking !== undefined) {
          style.letterSpacing = `${spec.tracking}em`;
        }
        if (spec.italic) {
          style.fontStyle = "italic";
        }
        if (spec.uppercase) {
          style.textTransform = "uppercase";
        }
      }
      return style;
    },
  };
};
