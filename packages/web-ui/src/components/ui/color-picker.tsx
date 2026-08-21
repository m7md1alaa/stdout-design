/* eslint-disable react/react-compiler, no-shadow, complexity, default-case, sort-vars, jsx-a11y/no-noninteractive-element-interactions, jsx-a11y/no-noninteractive-tabindex, react/jsx-handler-names, react-hooks/exhaustive-deps, jsx-a11y/prefer-tag-over-role */

"use client";

import { Menu } from "@base-ui/react/menu";
import { NumberField } from "@base-ui/react/number-field";
import { Popover } from "@base-ui/react/popover";
import { Slider as SliderPrimitive } from "@base-ui/react/slider";
import { motion, AnimatePresence } from "framer-motion";
import {
  createContext,
  createElement,
  forwardRef,
  useContext,
  useRef,
  useState,
  useEffect,
  useCallback,
  useMemo,
} from "react";
import type {
  CSSProperties,
  ForwardRefRenderFunction,
  HTMLAttributes,
  ReactNode,
} from "react";

import { Tooltip, TooltipPopup, TooltipTrigger } from "@/components/ui/tooltip";
import { useProximityHover } from "@/hooks/use-proximity-hover";
import { Elevated } from "@/lib/elevated";
import { fontWeights } from "@/lib/font-weight";
import { useIcon } from "@/lib/icon-context";
import { useShape, shapeMap } from "@/lib/shape-context";
import { SizeProvider, useSize } from "@/lib/size-context";
import type { SizeVariant } from "@/lib/size-context";
import { spring } from "@/lib/springs";
import { surfaceClasses } from "@/lib/surface-classes";
import { useSurface, SurfaceProvider } from "@/lib/surface-context";
import { cn } from "@/lib/utils";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type ColorFormat = "hex" | "rgb" | "hsl" | "oklch";

// Allows consumers (e.g. the /demo carousel) to portal popups inside a
// CSS-scaled ancestor so menu/popover layers visually scale with the picker.
const ColorPickerPortalContainerContext = createContext<HTMLElement | null>(
  null
);

const ColorPickerPortalContainer = ({
  value,
  children,
}: {
  value: HTMLElement | null;
  children: ReactNode;
}) => (
  <ColorPickerPortalContainerContext.Provider value={value}>
    {children}
  </ColorPickerPortalContainerContext.Provider>
);

interface ParsedColor {
  // HSV (canonical, 0..360 / 0..1 / 0..1)
  h: number;
  s: number;
  v: number;
  a: number;
  // sRGB 0..255
  r: number;
  g: number;
  b: number;
  // Formatted strings
  hex: string;
  rgb: string;
  hsl: string;
  oklch: string;
}

interface ColorPickerProps extends Omit<
  HTMLAttributes<HTMLDivElement>,
  "onChange" | "defaultValue"
> {
  value?: string;
  defaultValue?: string;
  onValueChange?: (value: string, parsed: ParsedColor) => void;
  format?: ColorFormat;
  defaultFormat?: ColorFormat;
  onFormatChange?: (format: ColorFormat) => void;
  swatches?: string[];
  hideEyedropper?: boolean;
  /** Controls the format dropdown's open state. When provided, the dropdown
   *  is fully controlled and ignores user toggles. */
  formatOpen?: boolean;
  /** Initial open state for the format dropdown (uncontrolled). */
  defaultFormatOpen?: boolean;
  /** Pins trigger and popover to one step of the size ladder (default 36px,
   *  compact 28px — see /docs/sizes). Omitted, they follow the surrounding
   *  SizeProvider. */
  size?: SizeVariant;
}

interface ColorPickerPopoverProps extends ColorPickerProps {
  triggerLabel?: string;
  triggerLabelPosition?: "left" | "right";
  triggerShowValue?: boolean;
  triggerShowRemove?: boolean;
  onTriggerRemove?: () => void;
  triggerClassName?: string;
  /** Controls the popover's open state. When provided, the popover is fully
   *  controlled and ignores trigger clicks. */
  open?: boolean;
  /** Initial open state for the popover (uncontrolled). */
  defaultOpen?: boolean;
  /** Called when the open state would change (fires even when controlled). */
  onOpenChange?: (open: boolean) => void;
}

interface ColorSwatchProps extends Omit<
  HTMLAttributes<HTMLButtonElement>,
  "color"
> {
  color: string;
  size?: number;
  selected?: boolean;
}

// ---------------------------------------------------------------------------
// Color math (no deps)
// ---------------------------------------------------------------------------

const clamp01 = (n: number) => Math.max(0, Math.min(1, n));

const clamp255 = (n: number) => Math.max(0, Math.min(255, n));

const hsvToRgb = (
  h: number,
  s: number,
  v: number
): { r: number; g: number; b: number } => {
  const c = v * s;
  const hh = (((h % 360) + 360) % 360) / 60;
  const x = c * (1 - Math.abs((hh % 2) - 1));
  let b = 0;
  let g = 0;
  let r = 0;
  if (hh < 1) {
    r = c;
    g = x;
    b = 0;
  } else if (hh < 2) {
    r = x;
    g = c;
    b = 0;
  } else if (hh < 3) {
    r = 0;
    g = c;
    b = x;
  } else if (hh < 4) {
    r = 0;
    g = x;
    b = c;
  } else if (hh < 5) {
    r = x;
    g = 0;
    b = c;
  } else {
    r = c;
    g = 0;
    b = x;
  }
  const m = v - c;
  return { b: (b + m) * 255, g: (g + m) * 255, r: (r + m) * 255 };
};

const rgbToHsv = (
  r: number,
  g: number,
  b: number
): { h: number; s: number; v: number } => {
  const rr = r / 255;
  const gg = g / 255;
  const bb = b / 255;
  const max = Math.max(rr, gg, bb);
  const min = Math.min(rr, gg, bb);
  const v = max;
  const d = max - min;
  const s = max === 0 ? 0 : d / max;
  let h = 0;
  if (d > 0) {
    if (max === rr) {
      h = ((gg - bb) / d) % 6;
    } else if (max === gg) {
      h = (bb - rr) / d + 2;
    } else {
      h = (rr - gg) / d + 4;
    }
    h *= 60;
    if (h < 0) {
      h += 360;
    }
  }
  return { h, s, v };
};

const rgbToHsl = (
  r: number,
  g: number,
  b: number
): { h: number; s: number; l: number } => {
  const rr = r / 255;
  const gg = g / 255;
  const bb = b / 255;
  const max = Math.max(rr, gg, bb);
  const min = Math.min(rr, gg, bb);
  const l = (max + min) / 2;
  const d = max - min;
  let h = 0;
  let s = 0;
  if (d > 0) {
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    if (max === r) {
      h = ((g - b) / d) % 6;
    } else if (max === g) {
      h = (b - r) / d + 2;
    } else {
      h = (r - g) / d + 4;
    }
    h *= 60;
    if (h < 0) {
      h += 360;
    }
  }
  return { h, l, s };
};

const hslToRgb = (
  h: number,
  s: number,
  l: number
): { r: number; g: number; b: number } => {
  const c = (1 - Math.abs(2 * l - 1)) * s;
  const hh = (((h % 360) + 360) % 360) / 60;
  const x = c * (1 - Math.abs((hh % 2) - 1));
  let b = 0;
  let g = 0;
  let r = 0;
  if (hh < 1) {
    r = c;
    g = x;
  } else if (hh < 2) {
    r = x;
    g = c;
  } else if (hh < 3) {
    g = c;
    b = x;
  } else if (hh < 4) {
    g = x;
    b = c;
  } else if (hh < 5) {
    r = x;
    b = c;
  } else {
    r = c;
    b = x;
  }
  const m = l - c / 2;
  return { b: (b + m) * 255, g: (g + m) * 255, r: (r + m) * 255 };
};

const srgbToLinear = (c: number): number => {
  const cc = c / 255;
  return cc <= 0.04045 ? cc / 12.92 : ((cc + 0.055) / 1.055) ** 2.4;
};

const linearToSrgb = (c: number): number => {
  const v = c <= 0.0031308 ? 12.92 * c : 1.055 * c ** (1 / 2.4) - 0.055;
  return clamp01(v) * 255;
};

const linearRgbToOklab = (
  r: number,
  g: number,
  b: number
): { L: number; a: number; b: number } => {
  const l = 0.4122214708 * r + 0.5363325363 * g + 0.0514459929 * b;
  const m = 0.2119034982 * r + 0.6806995451 * g + 0.1073969566 * b;
  const s = 0.0883024619 * r + 0.2817188376 * g + 0.6299787005 * b;
  const l_ = Math.cbrt(l);
  const m_ = Math.cbrt(m);
  const s_ = Math.cbrt(s);
  return {
    L: 0.2104542553 * l_ + 0.793617785 * m_ - 0.0040720468 * s_,
    a: 1.9779984951 * l_ - 2.428592205 * m_ + 0.4505937099 * s_,
    b: 0.0259040371 * l_ + 0.7827717662 * m_ - 0.808675766 * s_,
  };
};

const oklabToLinearRgb = (
  L: number,
  a: number,
  b: number
): { r: number; g: number; b: number } => {
  const l_ = L + 0.3963377774 * a + 0.2158037573 * b;
  const m_ = L - 0.1055613458 * a - 0.0638541728 * b;
  const s_ = L - 0.0894841775 * a - 1.291485548 * b;
  const l = l_ * l_ * l_;
  const m = m_ * m_ * m_;
  const s = s_ * s_ * s_;
  return {
    b: -0.0041960863 * l - 0.7034186147 * m + 1.707614701 * s,
    g: -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s,
    r: 4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s,
  };
};

const rgbToOklch = (
  r: number,
  g: number,
  b: number
): { L: number; C: number; H: number } => {
  const lr = srgbToLinear(r);
  const lg = srgbToLinear(g);
  const lb = srgbToLinear(b);
  const lab = linearRgbToOklab(lr, lg, lb);
  const C = Math.hypot(lab.a * lab.a + lab.b * lab.b);
  let H = (Math.atan2(lab.b, lab.a) * 180) / Math.PI;
  if (H < 0) {
    H += 360;
  }
  return { C, H, L: lab.L };
};

const oklchToRgb = (
  L: number,
  C: number,
  H: number
): { r: number; g: number; b: number } => {
  const a = C * Math.cos((H * Math.PI) / 180);
  const b = C * Math.sin((H * Math.PI) / 180);
  const lin = oklabToLinearRgb(L, a, b);
  // Clamp to sRGB silently (option a from plan)
  return {
    b: clamp255(linearToSrgb(lin.b)),
    g: clamp255(linearToSrgb(lin.g)),
    r: clamp255(linearToSrgb(lin.r)),
  };
};

const to2hex = (n: number): string =>
  Math.round(clamp255(n)).toString(16).padStart(2, "0");

const rgbToHexStr = (r: number, g: number, b: number, a: number): string => {
  if (a >= 1) {
    return `#${to2hex(r)}${to2hex(g)}${to2hex(b)}`;
  }
  return `#${to2hex(r)}${to2hex(g)}${to2hex(b)}${to2hex(a * 255)}`;
};

const expandShortHex = (h: string): string => {
  if (h.length === 3) {
    return [...h].map((c) => c + c).join("");
  }
  if (h.length === 4) {
    return [...h].map((c) => c + c).join("");
  }
  return h;
};

const parseHex = (
  input: string
): { r: number; g: number; b: number; a: number } | null => {
  const m = input.trim().match(/^(?<hex>[0-9a-fA-F]{3,8})$/u);
  if (!m?.groups?.hex) {
    return null;
  }
  let h = m.groups.hex;
  if (h.length === 3 || h.length === 4) {
    h = expandShortHex(h);
  }
  if (h.length === 6) {
    return {
      a: 1,
      b: Number.parseInt(h.slice(4, 6), 16),
      g: Number.parseInt(h.slice(2, 4), 16),
      r: Number.parseInt(h.slice(0, 2), 16),
    };
  }
  if (h.length === 8) {
    return {
      a: Number.parseInt(h.slice(6, 8), 16) / 255,
      b: Number.parseInt(h.slice(4, 6), 16),
      g: Number.parseInt(h.slice(2, 4), 16),
      r: Number.parseInt(h.slice(0, 2), 16),
    };
  }
  return null;
};

const parseColor = (
  input: string
): { r: number; g: number; b: number; a: number } | null => {
  const s = input.trim();
  if (!s) {
    return null;
  }
  if (s.startsWith("#") || /^[0-9a-fA-F]{3,8}$/u.test(s)) {
    return parseHex(s);
  }
  const rgbM = s.match(/^rgba?\(\s*(?<channels>[^)]+)\)$/iu);
  if (rgbM?.groups?.channels) {
    const parts = rgbM.groups.channels.split(/[\s,/]+/u).filter(Boolean);
    if (parts.length < 3) {
      return null;
    }
    const [rPart, gPart, bPart, alphaPart] = parts;
    const r = Number(rPart);
    const g = Number(gPart);
    const b = Number(bPart);
    let a = 1;
    if (alphaPart !== undefined) {
      a = alphaPart.endsWith("%") ? Number(alphaPart) / 100 : Number(alphaPart);
    }
    if ([r, g, b, a].some(Number.isNaN)) {
      return null;
    }
    return { a: clamp01(a), b: clamp255(b), g: clamp255(g), r: clamp255(r) };
  }
  const hslM = s.match(/^hsla?\(\s*(?<channels>[^)]+)\)$/iu);
  if (hslM?.groups?.channels) {
    const parts = hslM.groups.channels.split(/[\s,/]+/u).filter(Boolean);
    if (parts.length < 3) {
      return null;
    }
    const [hPart, satPart, lPart, alphaPart] = parts;
    if (satPart === undefined || lPart === undefined) {
      return null;
    }
    const h = Number(hPart);
    const sat = satPart.endsWith("%") ? Number(satPart) / 100 : Number(satPart);
    const l = lPart.endsWith("%") ? Number(lPart) / 100 : Number(lPart);
    let a = 1;
    if (alphaPart !== undefined) {
      a = alphaPart.endsWith("%") ? Number(alphaPart) / 100 : Number(alphaPart);
    }
    if ([h, sat, l, a].some(Number.isNaN)) {
      return null;
    }
    const rgb = hslToRgb(h, clamp01(sat), clamp01(l));
    return {
      a: clamp01(a),
      b: clamp255(rgb.b),
      g: clamp255(rgb.g),
      r: clamp255(rgb.r),
    };
  }
  const oklchM = s.match(/^oklch\(\s*(?<channels>[^)]+)\)$/iu);
  if (oklchM?.groups?.channels) {
    const parts = oklchM.groups.channels.split(/[\s,/]+/u).filter(Boolean);
    if (parts.length < 3) {
      return null;
    }
    const [lPart, cPart, hPart, alphaPart] = parts;
    if (lPart === undefined) {
      return null;
    }
    const L = lPart.endsWith("%") ? Number(lPart) / 100 : Number(lPart);
    const C = Number(cPart);
    const H = Number(hPart);
    let a = 1;
    if (alphaPart !== undefined) {
      a = alphaPart.endsWith("%") ? Number(alphaPart) / 100 : Number(alphaPart);
    }
    if ([L, C, H, a].some(Number.isNaN)) {
      return null;
    }
    const rgb = oklchToRgb(clamp01(L), Math.max(0, C), H);
    return {
      a: clamp01(a),
      b: clamp255(rgb.b),
      g: clamp255(rgb.g),
      r: clamp255(rgb.r),
    };
  }
  return null;
};

// Browser-assisted fallback for color strings the manual parser doesn't cover
// (named CSS colors like "red" / "tomato", etc.). A canvas 2d context
// round-trips any valid CSS color through `fillStyle`, which serializes to a
// hex or rgba() string that parseColor understands. Must only be called from
// event handlers or effects — never at module scope or during render — so SSR
// stays safe.
let cssColorCtx: CanvasRenderingContext2D | null = null;

const resolveCssColor = (
  input: string
): { r: number; g: number; b: number; a: number } | null => {
  const direct = parseColor(input);
  if (direct) {
    return direct;
  }
  const s = input.trim();
  if (!s || typeof document === "undefined") {
    return null;
  }
  if (!cssColorCtx) {
    cssColorCtx = document.createElement("canvas").getContext("2d");
    if (!cssColorCtx) {
      return null;
    }
  }
  const ctx = cssColorCtx;
  // An invalid color assignment leaves fillStyle untouched, so round-trip from
  // two different starting values to detect rejection.
  ctx.fillStyle = "#000000";
  ctx.fillStyle = s;
  const first = String(ctx.fillStyle);
  ctx.fillStyle = "#ffffff";
  ctx.fillStyle = s;
  const second = String(ctx.fillStyle);
  if (first !== second) {
    return null;
  }
  return parseColor(first);
};

const buildParsed = (
  h: number,
  s: number,
  v: number,
  a: number
): ParsedColor => {
  const { r, g, b } = hsvToRgb(h, s, v);
  const hsl = rgbToHsl(r, g, b);
  const oklch = rgbToOklch(r, g, b);
  const hex = rgbToHexStr(r, g, b, a);
  const rgbStr =
    a >= 1
      ? `rgb(${Math.round(r)}, ${Math.round(g)}, ${Math.round(b)})`
      : `rgba(${Math.round(r)}, ${Math.round(g)}, ${Math.round(b)}, ${Number(a.toFixed(3))})`;
  const hslStr =
    a >= 1
      ? `hsl(${Math.round(hsl.h)}, ${Math.round(hsl.s * 100)}%, ${Math.round(hsl.l * 100)}%)`
      : `hsla(${Math.round(hsl.h)}, ${Math.round(hsl.s * 100)}%, ${Math.round(hsl.l * 100)}%, ${Number(a.toFixed(3))})`;
  const oklchStr =
    a >= 1
      ? `oklch(${(oklch.L * 100).toFixed(1)}% ${oklch.C.toFixed(3)} ${oklch.H.toFixed(1)})`
      : `oklch(${(oklch.L * 100).toFixed(1)}% ${oklch.C.toFixed(3)} ${oklch.H.toFixed(1)} / ${Number(a.toFixed(3))})`;
  return {
    a,
    b: Math.round(b),
    g: Math.round(g),
    h,
    hex,
    hsl: hslStr,
    oklch: oklchStr,
    r: Math.round(r),
    rgb: rgbStr,
    s,
    v,
  };
};

const formatValueByFormat = (parsed: ParsedColor, fmt: ColorFormat): string => {
  switch (fmt) {
    case "hex": {
      return parsed.hex;
    }
    case "rgb": {
      return parsed.rgb;
    }
    case "hsl": {
      return parsed.hsl;
    }
    case "oklch": {
      return parsed.oklch;
    }
  }
};

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const PANEL_WIDTH = 280;
const SQUARE_HEIGHT = 156;
const CHECKER_BG: CSSProperties = {
  backgroundImage:
    "conic-gradient(var(--checker-a) 0 25%, var(--checker-b) 0 50%, var(--checker-a) 0 75%, var(--checker-b) 0)",
  backgroundSize: "8px 8px",
};

// ---------------------------------------------------------------------------
// SaturationSquare
// ---------------------------------------------------------------------------

interface SaturationSquareProps {
  h: number;
  s: number;
  v: number;
  onChange: (s: number, v: number) => void;
}

const SaturationSquare = ({ h, s, v, onChange }: SaturationSquareProps) => {
  const ref = useRef<HTMLDivElement>(null);
  // State (not a ref): this gates the ghost hover cursor during render, and a
  // ref mutation wouldn't re-render, letting the ghost stick around.
  const [dragging, setDragging] = useState(false);
  const hasMoved = useRef(false);
  const [focused, setFocused] = useState(false);
  const [hovered, setHovered] = useState(false);
  const [cursorPos, setCursorPos] = useState<{ x: number; y: number } | null>(
    null
  );
  const shape = useShape();

  const updateFromPointer = useCallback(
    (clientX: number, clientY: number) => {
      const rect = ref.current?.getBoundingClientRect();
      if (!rect) {
        return;
      }
      const x = clamp01((clientX - rect.left) / rect.width);
      const y = clamp01((clientY - rect.top) / rect.height);
      onChange(x, 1 - y);
    },
    [onChange]
  );

  const updateCursorPos = useCallback((clientX: number, clientY: number) => {
    const rect = ref.current?.getBoundingClientRect();
    if (!rect) {
      return;
    }
    setCursorPos({
      x: clamp01((clientX - rect.left) / rect.width) * 100,
      y: clamp01((clientY - rect.top) / rect.height) * 100,
    });
  }, []);

  const onPointerDown = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      if (e.pointerType === "mouse" && e.button !== 0) {
        return;
      }
      e.preventDefault();
      setDragging(true);
      hasMoved.current = false;
      (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
      updateFromPointer(e.clientX, e.clientY);
    },
    [updateFromPointer]
  );

  const onPointerMove = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      updateCursorPos(e.clientX, e.clientY);
      if (!dragging) {
        return;
      }
      hasMoved.current = true;
      updateFromPointer(e.clientX, e.clientY);
    },
    [dragging, updateFromPointer, updateCursorPos]
  );

  const onPointerUp = useCallback(() => {
    setDragging(false);
    hasMoved.current = false;
  }, []);

  const onKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLDivElement>) => {
      const step = e.shiftKey ? 0.1 : 0.01;
      let nextS = s;
      let nextV = v;
      let handled = true;
      if (e.key === "ArrowLeft") {
        nextS = clamp01(s - step);
      } else if (e.key === "ArrowRight") {
        nextS = clamp01(s + step);
      } else if (e.key === "ArrowUp") {
        nextV = clamp01(v + step);
      } else if (e.key === "ArrowDown") {
        nextV = clamp01(v - step);
      } else {
        handled = false;
      }
      if (handled) {
        e.preventDefault();
        onChange(nextS, nextV);
      }
    },
    [onChange, s, v]
  );

  const { r, g, b } = hsvToRgb(h, s, v);
  const thumbColor = `rgb(${Math.round(r)}, ${Math.round(g)}, ${Math.round(b)})`;

  return (
    <div
      ref={ref}
      role="application"
      aria-label="Saturation and brightness"
      tabIndex={0}
      onFocus={(e) => {
        if (e.currentTarget.matches(":focus-visible")) {
          setFocused(true);
        }
      }}
      onBlur={() => setFocused(false)}
      onPointerEnter={() => setHovered(true)}
      onPointerLeave={() => {
        setHovered(false);
        setCursorPos(null);
      }}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onKeyDown={onKeyDown}
      className={cn(
        "relative w-full cursor-none touch-none outline-none select-none",
        shape.bg
      )}
      style={{
        boxShadow: focused ? "0 0 0 2px var(--ring)" : undefined,
        height: SQUARE_HEIGHT,
      }}
    >
      <div
        className={cn(
          "absolute inset-0 overflow-hidden",
          shape.bg === "rounded-[20px]" ? "rounded-2xl" : shape.bg
        )}
        style={{
          background: `linear-gradient(to top, #000, transparent), linear-gradient(to right, #fff, hsl(${h}, 100%, 50%))`,
        }}
      />
      <motion.div
        className="pointer-events-none absolute rounded-full"
        initial={false}
        animate={{
          height: 18,
          left: `${s * 100}%`,
          top: `${(1 - v) * 100}%`,
          width: 18,
        }}
        transition={{ duration: 0 }}
        style={{
          backgroundColor: thumbColor,
          border: "1px solid var(--foreground)",
          boxShadow: "0 0 0 1px var(--background)",
          transform: "translate(-50%, -50%)",
        }}
      />
      {hovered && !dragging && cursorPos && (
        <div
          className="pointer-events-none absolute rounded-full"
          style={{
            border:
              "2px solid color-mix(in oklab, var(--foreground) 55%, transparent)",
            boxShadow:
              "0 0 0 1px color-mix(in oklab, var(--background) 60%, transparent)",
            height: 18,
            left: `${cursorPos.x}%`,
            top: `${cursorPos.y}%`,
            transform: "translate(-50%, -50%)",
            width: 18,
          }}
        />
      )}
    </div>
  );
};

// ---------------------------------------------------------------------------
// ColorPickerSlider
//
// A single-thumb slider built directly on Base UI's Slider primitive (rather
// than the shared `ui/slider` wrapper, which hardcodes its own track/thumb
// classes and has no seam for a custom gradient track or thumb color). Used
// by both HueSlider and AlphaSlider below, which each just supply the track
// background and thumb color. No fill indicator is rendered — the gradient
// track itself communicates the value.
// ---------------------------------------------------------------------------

interface ColorPickerSliderProps {
  value: number;
  onChange: (v: number) => void;
  min: number;
  max: number;
  step: number;
  thumbColor: string;
  thumbBorderColor: string;
  trackStyle: CSSProperties;
  "aria-label": string;
}

const ColorPickerSlider = ({
  value,
  onChange,
  min,
  max,
  step,
  thumbColor,
  thumbBorderColor,
  trackStyle,
  "aria-label": ariaLabel,
}: ColorPickerSliderProps) => (
  <SliderPrimitive.Root
    aria-label={ariaLabel}
    className="relative flex w-full touch-none items-center select-none"
    max={max}
    min={min}
    onValueChange={(next) => onChange(next)}
    step={step}
    thumbAlignment="edge"
    value={value}
  >
    <SliderPrimitive.Control className="flex w-full min-w-44 touch-none select-none">
      <SliderPrimitive.Track
        className="relative h-1.5 w-full rounded-full"
        style={trackStyle}
      >
        <SliderPrimitive.Thumb
          className="focus-visible:ring-ring block size-4 shrink-0 rounded-full shadow-sm transition-[box-shadow,scale] outline-none select-none focus-visible:ring-2 data-dragging:scale-110"
          style={{
            backgroundColor: thumbColor,
            border: `1px solid ${thumbBorderColor}`,
          }}
        />
      </SliderPrimitive.Track>
    </SliderPrimitive.Control>
  </SliderPrimitive.Root>
);

// ---------------------------------------------------------------------------
// HueSlider
// ---------------------------------------------------------------------------

const HueSlider = ({
  h,
  onChange,
}: {
  h: number;
  onChange: (h: number) => void;
}) => {
  const hueColor = `hsl(${h}, 100%, 50%)`;
  return (
    <ColorPickerSlider
      aria-label="Hue"
      max={360}
      min={0}
      onChange={onChange}
      step={1}
      thumbBorderColor="var(--background)"
      thumbColor={hueColor}
      trackStyle={{
        background:
          "linear-gradient(to right, hsl(0,100%,50%), hsl(60,100%,50%), hsl(120,100%,50%), hsl(180,100%,50%), hsl(240,100%,50%), hsl(300,100%,50%), hsl(360,100%,50%))",
        borderColor: "transparent",
      }}
      value={h}
    />
  );
};

// ---------------------------------------------------------------------------
// AlphaSlider
// ---------------------------------------------------------------------------

const AlphaSlider = ({
  a,
  solidColor,
  solidR,
  solidG,
  solidB,
  onChange,
}: {
  a: number;
  solidColor: string;
  solidR: number;
  solidG: number;
  solidB: number;
  onChange: (a: number) => void;
}) => {
  // Use color-aware transparent stop (same hue, alpha 0) so the gradient stays
  // chromatically consistent and reaches fully opaque at 100% with no edge gap.
  const transparentColor = `rgba(${solidR}, ${solidG}, ${solidB}, 0)`;
  return (
    <ColorPickerSlider
      aria-label="Alpha"
      max={100}
      min={0}
      onChange={(v) => onChange(v / 100)}
      step={1}
      thumbBorderColor="var(--background)"
      thumbColor={solidColor}
      trackStyle={{
        backgroundImage: `linear-gradient(to right, ${transparentColor} 0%, ${solidColor} 98%), conic-gradient(var(--checker-a) 0 25%, var(--checker-b) 0 50%, var(--checker-a) 0 75%, var(--checker-b) 0)`,
        backgroundSize: "100% 100%, 8px 8px",
        borderWidth: 0,
      }}
      value={Math.round(a * 100)}
    />
  );
};

// ---------------------------------------------------------------------------
// FormatDropdown
//
// Built on Base UI's Menu primitive, which owns trigger wiring, positioning
// (anchor tracking + collision flipping — the old hand-rolled version computed
// coordinates once on open and detached from the trigger on scroll),
// dismissal, roving highlight, and typeahead. Menu.RadioGroup/RadioItem carry
// the radio semantics. This layer keeps the proximity-hover
// overlays and the spring open/close animation (actionsRef deferred unmount —
// the same verified pattern as select.tsx / dropdown.tsx).
// ---------------------------------------------------------------------------

const FORMAT_LABELS: Record<ColorFormat, string> = {
  hex: "HEX",
  hsl: "HSL",
  oklch: "OKLCH",
  rgb: "RGB",
};

const FORMATS = ["hex", "rgb", "hsl", "oklch"] as const;

// Popup surfaces opt out of the global pill/rounded shape — same rationale as
// the Dropdown component (pill radii distort perceived padding at this scale).
const menuShape = shapeMap.rounded;

interface FormatMenuContextValue {
  registerItem: (index: number, element: HTMLElement | null) => void;
  activeIndex: number | null;
  checkedIndex?: number;
}

const FormatMenuContext = createContext<FormatMenuContextValue | null>(null);

const FormatItem = ({
  index,
  value,
  label,
  checked,
}: {
  index: number;
  value: ColorFormat;
  label: string;
  checked: boolean;
}) => {
  const ref = useRef<HTMLDivElement>(null);
  const menuCtx = useContext(FormatMenuContext);
  const shape = useShape();
  const sizeClasses = useSize();
  const compact = sizeClasses.variant === "compact";

  useEffect(() => {
    menuCtx?.registerItem(index, ref.current);
    return () => menuCtx?.registerItem(index, null);
  }, [index, menuCtx]);

  const isActive = menuCtx?.activeIndex === index;

  return (
    <Menu.RadioItem
      value={value}
      label={label}
      closeOnClick
      render={
        <div
          ref={ref}
          data-proximity-index={index}
          className={cn(
            "relative z-10 flex cursor-pointer items-center outline-none",
            compact ? "px-2.5 py-1.5" : "px-3 py-2",
            sizeClasses.text,
            shape.item
          )}
        />
      }
    >
      <span className="inline-grid">
        <span
          className="invisible col-start-1 row-start-1"
          style={{ fontVariationSettings: fontWeights.semibold }}
          aria-hidden="true"
        >
          {label}
        </span>
        <span
          className={cn(
            "col-start-1 row-start-1 transition-[color,font-variation-settings] duration-80",
            isActive || checked ? "text-foreground" : "text-muted-foreground"
          )}
          style={{
            fontVariationSettings: checked
              ? fontWeights.semibold
              : fontWeights.normal,
          }}
        >
          {label}
        </span>
      </span>
    </Menu.RadioItem>
  );
};

const FormatDropdown = ({
  value,
  onChange,
  open: openProp,
  defaultOpen = false,
}: {
  value: ColorFormat;
  onChange: (f: ColorFormat) => void;
  open?: boolean;
  defaultOpen?: boolean;
}) => {
  const [internalOpen, setInternalOpen] = useState(defaultOpen);
  const isControlled = openProp !== undefined;
  const open = isControlled ? openProp : internalOpen;
  const actionsRef = useRef<{ unmount: () => void; close: () => void } | null>(
    null
  );
  const shape = useShape();
  const sizeClasses = useSize();
  const portalContainer = useContext(ColorPickerPortalContainerContext);
  const containerRef = useRef<HTMLDivElement>(null);
  const ChevronDownIcon = useIcon("chevron-down");

  const {
    activeIndex,
    setActiveIndex,
    itemRects,
    session,
    handlers,
    registerItem,
    measureItems,
  } = useProximityHover(containerRef);

  const [focusedIndex, setFocusedIndex] = useState<number | null>(null);

  // Release Base UI's deferred unmount once the exit tween has played.
  // onAnimationComplete on the motion.div is the primary signal; this timeout
  // is a fallback for throttled/background tabs where rAF-driven animation
  // callbacks can stall (spring.fast.exit is 60ms — 120ms covers it with
  // margin without holding the portal open perceptibly).
  useEffect(() => {
    if (open) {
      return;
    }
    const id = setTimeout(() => actionsRef.current?.unmount(), 120);
    return () => clearTimeout(id);
  }, [open]);

  // Measure items once the popup has mounted.
  useEffect(() => {
    if (!open) {
      return;
    }
    // Double rAF: first waits for React commit, second for layout
    let inner: number;
    const outer = requestAnimationFrame(() => {
      inner = requestAnimationFrame(() => {
        measureItems();
      });
    });
    return () => {
      cancelAnimationFrame(outer);
      cancelAnimationFrame(inner);
    };
  }, [open, measureItems]);

  const checkedIndex = FORMATS.indexOf(value);
  const activeRect = activeIndex === null ? null : itemRects[activeIndex];
  const checkedRect = checkedIndex === -1 ? null : itemRects[checkedIndex];
  const focusRect = focusedIndex === null ? null : itemRects[focusedIndex];
  const menuCtx = useMemo(
    () => ({ activeIndex, checkedIndex, registerItem }),
    [registerItem, activeIndex, checkedIndex]
  );

  return (
    <Menu.Root
      open={open}
      onOpenChange={(next) => {
        if (!isControlled) {
          setInternalOpen(next);
        }
      }}
      actionsRef={actionsRef}
      // Non-modal: the page keeps scrolling and the Positioner tracks the
      // anchor, so the popup follows its trigger instead of detaching.
      modal={false}
    >
      <Menu.Trigger
        className={cn(
          "hover:bg-hover hover:text-foreground focus-visible:ring-ring flex cursor-pointer items-center justify-between bg-transparent transition-colors duration-80 outline-none focus-visible:ring-1",
          sizeClasses.gap,
          sizeClasses.control,
          sizeClasses.px,
          sizeClasses.text,
          open
            ? "bg-active text-foreground"
            : "text-muted-foreground active:bg-active",
          shape.input
        )}
        style={{ fontVariationSettings: fontWeights.medium }}
      >
        <span>{FORMAT_LABELS[value]}</span>
        {
          // Rendered via createElement rather than JSX: `ChevronDownIcon` is
          // resolved at render time (useIcon), so the compiler can't prove
          // it's a stable component reference and treats a JSX tag here as
          // defining a fresh component on every render. It's just a lookup
          // into a stable icon map, so a plain element call is correct.
          createElement(ChevronDownIcon, {
            className: cn(
              "text-muted-foreground transition-transform duration-150",
              open && "rotate-180"
            ),
            size: 14,
            strokeWidth: 1.5,
          })
        }
      </Menu.Trigger>
      <Menu.Portal container={portalContainer ?? undefined}>
        <Menu.Positioner
          side="bottom"
          align="start"
          sideOffset={6}
          className="z-[60] outline-none"
        >
          <motion.div
            initial={{ opacity: 0, scaleY: 0.96, y: -4 }}
            animate={
              open
                ? { opacity: 1, scaleY: 1, y: 0 }
                : { opacity: 0, scaleY: 0.96, y: -4 }
            }
            transition={open ? spring.fast : spring.fast.exit}
            style={{ transformOrigin: "top center" }}
            // Base UI defers unmount while actionsRef is set; release it once
            // the exit spring has finished so the close animation fully plays.
            onAnimationComplete={() => {
              if (!open) {
                actionsRef.current?.unmount();
              }
            }}
          >
            <FormatMenuContext.Provider value={menuCtx}>
              <Menu.Popup
                render={
                  <Elevated
                    offset={2}
                    shadowLevel={3}
                    ref={(node: HTMLDivElement | null) => {
                      (
                        containerRef as React.MutableRefObject<HTMLDivElement | null>
                      ).current = node;
                    }}
                  />
                }
                onMouseEnter={() => {
                  handlers.onMouseEnter();
                  setFocusedIndex(null);
                }}
                onMouseMove={handlers.onMouseMove}
                onMouseLeave={handlers.onMouseLeave}
                onFocus={(e) => {
                  const indexAttr = (
                    e.target as HTMLElement
                  ).closest<HTMLElement>("[data-proximity-index]")?.dataset
                    .proximityIndex;
                  if (indexAttr !== undefined) {
                    const idx = Number(indexAttr);
                    setActiveIndex(idx);
                    setFocusedIndex(
                      (e.target as HTMLElement).matches(":focus-visible")
                        ? idx
                        : null
                    );
                  }
                }}
                onBlur={(e) => {
                  if (containerRef.current?.contains(e.relatedTarget as Node)) {
                    return;
                  }
                  setFocusedIndex(null);
                  setActiveIndex(null);
                }}
                className={cn(
                  `relative flex min-w-[var(--anchor-width)] flex-col gap-0.5 ${menuShape.container} p-1 outline-none select-none`
                )}
              >
                {/* Selected background */}
                <AnimatePresence>
                  {checkedRect && (
                    <motion.div
                      className={`absolute ${menuShape.bg} bg-active pointer-events-none`}
                      initial={false}
                      animate={{
                        height: checkedRect.height,
                        left: checkedRect.left,
                        opacity: 1,
                        top: checkedRect.top,
                        width: checkedRect.width,
                      }}
                      exit={{ opacity: 0, transition: spring.moderate.exit }}
                      transition={{
                        ...spring.moderate,
                        opacity: { duration: 0.08 },
                      }}
                    />
                  )}
                </AnimatePresence>

                {/* Hover background */}
                <AnimatePresence>
                  {activeRect && (
                    <motion.div
                      key={session}
                      className={`absolute ${menuShape.bg} bg-hover pointer-events-none`}
                      initial={{
                        height: checkedRect?.height ?? activeRect.height,
                        left: checkedRect?.left ?? activeRect.left,
                        opacity: 0,
                        top: checkedRect?.top ?? activeRect.top,
                        width: checkedRect?.width ?? activeRect.width,
                      }}
                      animate={{
                        height: activeRect.height,
                        left: activeRect.left,
                        opacity: 1,
                        top: activeRect.top,
                        width: activeRect.width,
                      }}
                      exit={{ opacity: 0, transition: spring.fast.exit }}
                      transition={{
                        ...spring.fast,
                        opacity: { duration: 0.08 },
                      }}
                    />
                  )}
                </AnimatePresence>

                {/* Focus ring */}
                <AnimatePresence>
                  {focusRect && (
                    <motion.div
                      className={`absolute ${menuShape.focusRing} border-ring pointer-events-none z-20 border`}
                      initial={false}
                      animate={{
                        height: focusRect.height + 4,
                        left: focusRect.left - 2,
                        top: focusRect.top - 2,
                        width: focusRect.width + 4,
                      }}
                      exit={{ opacity: 0, transition: spring.fast.exit }}
                      transition={{
                        ...spring.fast,
                        opacity: { duration: 0.08 },
                      }}
                    />
                  )}
                </AnimatePresence>

                {/* display: contents keeps items direct flex children of the
                    popup so proximity measurement and gap layout still work,
                    while the group provides the radio value context. */}
                <Menu.RadioGroup
                  value={value}
                  onValueChange={(next) => onChange(next as ColorFormat)}
                  className="contents"
                >
                  {FORMATS.map((fmt, i) => (
                    <FormatItem
                      key={fmt}
                      index={i}
                      value={fmt}
                      label={FORMAT_LABELS[fmt]}
                      checked={value === fmt}
                    />
                  ))}
                </Menu.RadioGroup>
              </Menu.Popup>
            </FormatMenuContext.Provider>
          </motion.div>
        </Menu.Positioner>
      </Menu.Portal>
    </Menu.Root>
  );
};

// ---------------------------------------------------------------------------
// ColorInput
//
// Two internal variants behind one API:
// - TextColorInput: draft-based text input (hex).
// - ScrubColorInput: numeric channels, built on Base UI's NumberField whose
//   ScrubArea provides pointer-lock scrubbing with a virtual cursor,
//   replacing the old hand-rolled pointer-capture logic.
// ---------------------------------------------------------------------------

interface ColorInputProps {
  value: string;
  onCommit: (next: string) => void;
  ariaLabel: string;
  width?: string;
  className?: string;
  inputClassName?: string;
  align?: "left" | "center" | "right";
  prefix?: ReactNode;
  inputMode?: "numeric" | "decimal" | "text";
  nudgeStep?: number;
  nudgeShiftStep?: number;
  hasPercent?: boolean;
  decimals?: number;
  scrubbable?: boolean;
  min?: number;
  max?: number;
  /** When true with min and max, wrap (modulo) instead of clamping. Used for angular values like hue. */
  wrap?: boolean;
}

const TextColorInputInner: ForwardRefRenderFunction<
  HTMLInputElement,
  ColorInputProps
> = (
  {
    value,
    onCommit,
    ariaLabel,
    width,
    className,
    inputClassName,
    align = "left",
    prefix,
    inputMode = "text",
    nudgeStep,
    nudgeShiftStep,
    hasPercent = false,
    decimals,
    min,
    max,
    wrap = false,
  },
  ref
) => {
  const [draft, setDraft] = useState(value);
  const interactingRef = useRef(false);
  const shape = useShape();
  const sizeClasses = useSize();
  const compact = sizeClasses.variant === "compact";

  useEffect(() => {
    if (!interactingRef.current) {
      setDraft(value);
    }
  }, [value]);

  const formatNumber = (n: number) =>
    decimals === undefined ? String(Math.round(n)) : n.toFixed(decimals);

  const commitNumber = (n: number) => {
    let bounded = n;
    if (wrap && min !== undefined && max !== undefined) {
      const range = max - min;
      bounded = ((((bounded - min) % range) + range) % range) + min;
    } else {
      if (min !== undefined) {
        bounded = Math.max(min, bounded);
      }
      if (max !== undefined) {
        bounded = Math.min(max, bounded);
      }
    }
    const formatted = formatNumber(bounded);
    const withSuffix = hasPercent ? `${formatted}%` : formatted;
    setDraft(withSuffix);
    onCommit(withSuffix);
  };

  const nudge = (direction: 1 | -1, shift: boolean) => {
    const baseStep = shift ? (nudgeShiftStep ?? 10) : (nudgeStep ?? 1);
    const cur = Number(draft.replace("%", ""));
    if (Number.isNaN(cur)) {
      return;
    }
    commitNumber(cur + direction * baseStep);
  };

  return (
    <div
      className={cn(
        "hover:bg-hover active:bg-active focus-within:ring-ring flex items-center bg-transparent px-2 transition-colors duration-80 select-none focus-within:ring-1",
        sizeClasses.control,
        shape.input,
        className
      )}
      style={{ width }}
    >
      {prefix && (
        <span
          className={cn(
            "text-muted-foreground mr-1 select-none",
            compact ? "text-[11px]" : "text-[12px]"
          )}
        >
          {prefix}
        </span>
      )}
      <input
        ref={ref}
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onFocus={(e) => {
          interactingRef.current = true;
          e.currentTarget.select();
        }}
        onBlur={() => {
          interactingRef.current = false;
          if (draft === value) {
            setDraft(value);
          } else {
            const numeric = Number(draft.replace("%", ""));
            if (
              !Number.isNaN(numeric) &&
              (min !== undefined || max !== undefined)
            ) {
              commitNumber(numeric);
            } else {
              onCommit(draft);
            }
          }
        }}
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            (e.currentTarget as HTMLInputElement).blur();
          } else if (e.key === "Escape") {
            setDraft(value);
            (e.currentTarget as HTMLInputElement).blur();
          } else if (
            (nudgeStep !== undefined || nudgeShiftStep !== undefined) &&
            (e.key === "ArrowUp" || e.key === "ArrowDown")
          ) {
            e.preventDefault();
            nudge(e.key === "ArrowUp" ? 1 : -1, e.shiftKey);
          }
        }}
        inputMode={inputMode}
        aria-label={ariaLabel}
        className={cn(
          "text-foreground min-w-0 flex-1 bg-transparent tabular-nums outline-none",
          sizeClasses.text,
          align === "center" && "text-center",
          align === "right" && "text-right",
          inputClassName
        )}
        style={{ fontVariationSettings: fontWeights.medium }}
      />
    </div>
  );
};

const TextColorInput = forwardRef(TextColorInputInner);

TextColorInput.displayName = "TextColorInput";

const ScrubColorInputInner: ForwardRefRenderFunction<
  HTMLInputElement,
  ColorInputProps
> = (
  {
    value,
    onCommit,
    ariaLabel,
    width,
    className,
    inputClassName,
    align = "left",
    prefix,
    inputMode = "numeric",
    nudgeStep,
    nudgeShiftStep,
    hasPercent = false,
    decimals,
    min,
    max,
    wrap = false,
  },
  ref
) => {
  const shape = useShape();
  const sizeClasses = useSize();
  const compact = sizeClasses.variant === "compact";
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [editing, setEditing] = useState(false);
  // Set on pointerdown inside the scrub area (capture phase, before Base UI
  // focuses the input for scrubbing) so onFocus can tell scrub-focus apart
  // from keyboard/programmatic focus.
  const pointerDownRef = useRef(false);

  const numeric = Number(String(value).replace("%", ""));
  const fieldValue = Number.isNaN(numeric) ? null : numeric;

  const format = useMemo(() => {
    const f: Intl.NumberFormatOptions = { useGrouping: false };
    if (decimals === undefined) {
      f.maximumFractionDigits = 0;
    } else {
      f.minimumFractionDigits = decimals;
      f.maximumFractionDigits = decimals;
    }
    if (hasPercent) {
      // style "unit" + unit "percent" renders "50%" while keeping the
      // numeric value on the 0..100 scale (unlike style "percent").
      f.style = "unit";
      f.unit = "percent";
    }
    return f;
  }, [decimals, hasPercent]);

  const setInputRef = useCallback(
    (node: HTMLInputElement | null) => {
      inputRef.current = node;
      if (typeof ref === "function") {
        ref(node);
      } else if (ref) {
        (ref as React.MutableRefObject<HTMLInputElement | null>).current = node;
      }
    },
    [ref]
  );

  const commit = useCallback(
    (n: number) => {
      let bounded = n;
      if (wrap && min !== undefined && max !== undefined) {
        // Hue-style wrap: NumberField won't wrap natively, so shim it here
        // (361 → 1, -1 → 359; exactly `max` stays put).
        if (bounded < min || bounded > max) {
          const range = max - min;
          bounded = ((((bounded - min) % range) + range) % range) + min;
        }
      } else {
        if (min !== undefined) {
          bounded = Math.max(min, bounded);
        }
        if (max !== undefined) {
          bounded = Math.min(max, bounded);
        }
      }
      const formatted =
        decimals === undefined
          ? String(Math.round(bounded))
          : bounded.toFixed(decimals);
      onCommit(hasPercent ? `${formatted}%` : formatted);
    },
    [wrap, min, max, decimals, hasPercent, onCommit]
  );

  return (
    <NumberField.Root
      value={fieldValue}
      onValueChange={(next, eventDetails) => {
        if (next === null) {
          return;
        }
        const { reason } = eventDetails;
        // Preserve the old commit-on-blur typing semantics: ignore the
        // per-keystroke parses and let the input-blur change land the final
        // value. Keyboard nudges, scrubbing, and wheel commit immediately.
        if (
          reason === "input-change" ||
          reason === "input-paste" ||
          reason === "input-clear"
        ) {
          return;
        }
        commit(next);
      }}
      onValueCommitted={(_, eventDetails) => {
        // After a scrub gesture ends, drop the focus Base UI placed on the
        // input so the field returns to its rest state (matching the old
        // behavior). For a no-drag press, ScrubArea dispatches a synthetic
        // click right after this, which re-enters edit mode below.
        if (eventDetails.reason === "scrub") {
          pointerDownRef.current = false;
          inputRef.current?.blur();
        }
      }}
      min={wrap ? undefined : min}
      max={wrap ? undefined : max}
      step={nudgeStep ?? 1}
      largeStep={nudgeShiftStep ?? 10}
      format={format}
      className={cn(
        "hover:bg-hover active:bg-active focus-within:ring-ring flex items-center bg-transparent transition-colors duration-80 select-none focus-within:ring-1",
        sizeClasses.control,
        shape.input,
        className
      )}
      style={{ width }}
    >
      <NumberField.ScrubArea
        direction="horizontal"
        pixelSensitivity={1}
        onPointerDownCapture={() => {
          pointerDownRef.current = true;
        }}
        onClick={() => {
          // Real clicks and the synthetic click ScrubArea dispatches after a
          // no-drag press both land here → enter edit mode (focus + select),
          // like the old click-to-edit behavior.
          pointerDownRef.current = false;
          setEditing(true);
          inputRef.current?.focus();
          inputRef.current?.select();
        }}
        className={cn(
          "flex min-w-0 flex-1 items-center self-stretch px-2",
          !editing && "cursor-ew-resize"
        )}
      >
        <NumberField.ScrubAreaCursor className="drop-shadow-[0_1px_1px_rgba(0,0,0,0.4)]">
          <svg
            width={24}
            height={14}
            viewBox="0 0 24 14"
            fill="#000"
            stroke="#fff"
            strokeWidth={1}
            aria-hidden="true"
          >
            <path d="M0.5 7l5-5v3.5h13V2l5 5-5 5V8.5h-13V12l-5-5z" />
          </svg>
        </NumberField.ScrubAreaCursor>
        {prefix && (
          <span
            className={cn(
              "text-muted-foreground mr-1 select-none",
              compact ? "text-[11px]" : "text-[12px]"
            )}
          >
            {prefix}
          </span>
        )}
        <NumberField.Input
          ref={setInputRef}
          aria-label={ariaLabel}
          inputMode={inputMode}
          onPointerDown={(e) => {
            // While editing, let the input handle caret placement and text
            // selection itself instead of starting a scrub gesture.
            if (editing) {
              e.stopPropagation();
            }
          }}
          onFocus={(e) => {
            if (pointerDownRef.current) {
              return;
            }
            // scrub-initiated focus
            setEditing(true);
            e.currentTarget.select();
          }}
          onBlur={() => {
            setEditing(false);
          }}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.currentTarget.blur();
            } else if (e.key === "Escape") {
              // Revert the draft like the old input: restore the committed
              // value's text before blurring so the input-blur commit is a
              // no-op.
              const input = e.currentTarget;
              const setter = Object.getOwnPropertyDescriptor(
                window.HTMLInputElement.prototype,
                "value"
              )?.set;
              if (setter && fieldValue !== null) {
                const restored =
                  decimals === undefined
                    ? String(Math.round(fieldValue))
                    : fieldValue.toFixed(decimals);
                setter.call(input, hasPercent ? `${restored}%` : restored);
                input.dispatchEvent(new Event("input", { bubbles: true }));
              }
              input.blur();
            }
          }}
          className={cn(
            "text-foreground min-w-0 flex-1 bg-transparent tabular-nums outline-none",
            sizeClasses.text,
            align === "center" && "text-center",
            align === "right" && "text-right",
            !editing && "pointer-events-none",
            inputClassName
          )}
          style={{ fontVariationSettings: fontWeights.medium }}
        />
      </NumberField.ScrubArea>
    </NumberField.Root>
  );
};

const ScrubColorInput = forwardRef(ScrubColorInputInner);

ScrubColorInput.displayName = "ScrubColorInput";

const ColorInputInner: ForwardRefRenderFunction<
  HTMLInputElement,
  ColorInputProps
> = ({ scrubbable = false, ...props }, ref) =>
  scrubbable ? (
    <ScrubColorInput ref={ref} {...props} />
  ) : (
    <TextColorInput ref={ref} {...props} />
  );

const ColorInput = forwardRef(ColorInputInner);

ColorInput.displayName = "ColorInput";

// ---------------------------------------------------------------------------
// EyeDropperButton
// ---------------------------------------------------------------------------

interface EyeDropperGlobal {
  open: () => Promise<{ sRGBHex: string }>;
}

const EyeDropperButton = ({ onPick }: { onPick: (hex: string) => void }) => {
  // web-ui is a client-only Vite build (no SSR), so browser support can be
  // read straight off `window` — no state/effect needed, since it can't
  // change over the component's lifetime.
  const supported = typeof window !== "undefined" && "EyeDropper" in window;
  const shape = useShape();
  const sizeClasses = useSize();
  const PipetteIcon = useIcon("pipette");

  if (!supported) {
    return null;
  }

  const handleClick = async () => {
    try {
      const Ctor = (
        window as unknown as { EyeDropper: new () => EyeDropperGlobal }
      ).EyeDropper;
      const eye = new Ctor();
      const result = await eye.open();
      onPick(result.sRGBHex);
    } catch {
      // user cancelled
    }
  };

  return (
    <button
      type="button"
      onClick={handleClick}
      aria-label="Pick color from screen"
      className={cn(
        "text-muted-foreground hover:bg-hover hover:text-foreground active:bg-active focus-visible:ring-ring flex cursor-pointer items-center justify-center bg-transparent transition-colors duration-80 outline-none focus-visible:ring-1",
        sizeClasses.control,
        sizeClasses.px,
        shape.input
      )}
    >
      {
        // See the ChevronDownIcon comment above: useIcon resolves at render
        // time, so this goes through createElement rather than JSX.
        createElement(PipetteIcon, {
          size: sizeClasses.icon,
          strokeWidth: 1.5,
        })
      }
    </button>
  );
};

// ---------------------------------------------------------------------------
// ColorTile (small colored square — checker behind alpha)
// ---------------------------------------------------------------------------

interface ColorTileProps {
  color: string;
  size?: number;
  className?: string;
  style?: CSSProperties;
}

const ColorTile = ({ color, size = 24, className, style }: ColorTileProps) => {
  const shape = useShape();
  return (
    <span
      className={cn(
        "relative inline-block shrink-0 overflow-hidden",
        shape.bg,
        className
      )}
      style={{
        boxShadow: "inset 0 0 0 1px rgba(127,127,127,0.25)",
        height: size,
        width: size,
        ...CHECKER_BG,
        ...style,
      }}
    >
      <span className="absolute inset-0" style={{ backgroundColor: color }} />
    </span>
  );
};

// ---------------------------------------------------------------------------
// ColorSwatch (clickable strip swatch)
// ---------------------------------------------------------------------------

const ColorSwatchInner: ForwardRefRenderFunction<
  HTMLButtonElement,
  ColorSwatchProps
> = (
  {
    color,
    size = 28,
    selected,
    className,
    onMouseEnter,
    onMouseLeave,
    ...props
  },
  ref
) => {
  const shape = useShape();
  const [hovered, setHovered] = useState(false);
  let ring: string;
  if (selected) {
    ring =
      "inset 0 0 0 1px rgba(127,127,127,0.25), 0 0 0 2px var(--background), 0 0 0 4px var(--ring)";
  } else if (hovered) {
    ring =
      "inset 0 0 0 1px rgba(127,127,127,0.25), 0 0 0 2px var(--background), 0 0 0 4px rgba(127,127,127,0.4)";
  } else {
    ring = "inset 0 0 0 1px rgba(127,127,127,0.25)";
  }
  return (
    <button
      ref={ref}
      type="button"
      aria-label={`Select color ${color}`}
      className={cn(
        "relative shrink-0 cursor-pointer overflow-hidden transition-shadow duration-100 outline-none",
        shape.bg,
        className
      )}
      style={{
        boxShadow: ring,
        height: size,
        width: size,
        ...CHECKER_BG,
      }}
      onMouseEnter={(e) => {
        setHovered(true);
        onMouseEnter?.(e);
      }}
      onMouseLeave={(e) => {
        setHovered(false);
        onMouseLeave?.(e);
      }}
      {...props}
    >
      <span className="absolute inset-0" style={{ backgroundColor: color }} />
    </button>
  );
};

const ColorSwatch = forwardRef(ColorSwatchInner);

ColorSwatch.displayName = "ColorSwatch";

// ---------------------------------------------------------------------------
// SwatchStrip
// ---------------------------------------------------------------------------

type ChannelKey =
  | "hex"
  | "r"
  | "g"
  | "b"
  | "hSL"
  | "sSL"
  | "lSL"
  | "L"
  | "C"
  | "H"
  | "alphaPercent";

const ChannelTooltip = ({
  label,
  children,
}: {
  label: string;
  children: ReactNode;
}) => (
  <Tooltip>
    <TooltipTrigger delay={300} render={<div />}>
      {children}
    </TooltipTrigger>
    <TooltipPopup>{label}</TooltipPopup>
  </Tooltip>
);

const AlphaInput = ({
  value,
  onCommit,
}: {
  value: number;
  onCommit: (n: number) => void;
}) => (
  <ChannelTooltip label="Alpha">
    <ColorInput
      value={`${value}%`}
      onCommit={(input) => {
        const n = Number(input.replace("%", ""));
        if (Number.isNaN(n)) {
          return;
        }
        onCommit(Math.max(0, Math.min(100, Math.round(n))));
      }}
      ariaLabel="Alpha"
      align="center"
      inputMode="numeric"
      nudgeStep={1}
      nudgeShiftStep={10}
      hasPercent
      scrubbable
      min={0}
      max={100}
    />
  </ChannelTooltip>
);

// ---------------------------------------------------------------------------
// ColorPickerPopover (trigger button + popover panel)
//
// Built on Base UI's Popover primitive, which owns positioning (anchor
// tracking + collision flipping — the old version placed the panel at a
// captured rect and could overflow the viewport bottom), dismissal (outside
// press, focus-out, Escape only while focus is relevant), and focus
// management (focus moves into the panel on open and restores to the trigger
// on close). The spring open/close animation stays via the actionsRef
// deferred-unmount pattern (same as select.tsx) — the previous conditional
// portal unmounted the AnimatePresence container itself, so the exit
// animation never played.
// ---------------------------------------------------------------------------
// ColorInputsRow — adapts inputs to format
const ColorInputsRow = ({
  parsed,
  format,
  oklchHue,
  onChannelChange,
}: {
  parsed: ParsedColor;
  format: ColorFormat;
  /** Sticky OKLCH hue override for display (preserves user's stated H across round-trip drift). */
  oklchHue?: number | null;
  onChannelChange: (key: ChannelKey, value: string) => void;
}) => {
  const alphaPct = Math.round(parsed.a * 100);

  if (format === "hex") {
    const hexNoHash = parsed.hex.replace(/^#/u, "").toUpperCase();
    return (
      <div className="grid grid-cols-2 gap-2">
        <ChannelTooltip label="Hex">
          <ColorInput
            value={hexNoHash}
            onCommit={(next) =>
              onChannelChange("hex", next.startsWith("#") ? next : `#${next}`)
            }
            ariaLabel="Hex value"
            prefix="#"
          />
        </ChannelTooltip>
        <AlphaInput
          value={alphaPct}
          onCommit={(n) => onChannelChange("alphaPercent", String(n))}
        />
      </div>
    );
  }

  if (format === "rgb") {
    return (
      <div className="grid grid-cols-4 gap-1">
        <ChannelTooltip label="Red">
          <ColorInput
            value={String(parsed.r)}
            onCommit={(n) => onChannelChange("r", n)}
            ariaLabel="Red"
            align="center"
            inputMode="numeric"
            nudgeStep={1}
            nudgeShiftStep={10}
            scrubbable
            min={0}
            max={255}
          />
        </ChannelTooltip>
        <ChannelTooltip label="Green">
          <ColorInput
            value={String(parsed.g)}
            onCommit={(n) => onChannelChange("g", n)}
            ariaLabel="Green"
            align="center"
            inputMode="numeric"
            nudgeStep={1}
            nudgeShiftStep={10}
            scrubbable
            min={0}
            max={255}
          />
        </ChannelTooltip>
        <ChannelTooltip label="Blue">
          <ColorInput
            value={String(parsed.b)}
            onCommit={(n) => onChannelChange("b", n)}
            ariaLabel="Blue"
            align="center"
            inputMode="numeric"
            nudgeStep={1}
            nudgeShiftStep={10}
            scrubbable
            min={0}
            max={255}
          />
        </ChannelTooltip>
        <AlphaInput
          value={alphaPct}
          onCommit={(n) => onChannelChange("alphaPercent", String(n))}
        />
      </div>
    );
  }

  if (format === "hsl") {
    const hsl = rgbToHsl(parsed.r, parsed.g, parsed.b);
    return (
      <div className="grid grid-cols-4 gap-1">
        <ChannelTooltip label="Hue">
          <ColorInput
            value={String(Math.round(hsl.h))}
            onCommit={(n) => onChannelChange("hSL", n)}
            ariaLabel="Hue"
            align="center"
            inputMode="numeric"
            nudgeStep={1}
            nudgeShiftStep={10}
            scrubbable
            min={0}
            max={360}
            wrap
          />
        </ChannelTooltip>
        <ChannelTooltip label="Saturation">
          <ColorInput
            value={String(Math.round(hsl.s * 100))}
            onCommit={(n) => onChannelChange("sSL", n)}
            ariaLabel="Saturation"
            align="center"
            inputMode="numeric"
            nudgeStep={1}
            nudgeShiftStep={10}
            scrubbable
            min={0}
            max={100}
          />
        </ChannelTooltip>
        <ChannelTooltip label="Lightness">
          <ColorInput
            value={String(Math.round(hsl.l * 100))}
            onCommit={(n) => onChannelChange("lSL", n)}
            ariaLabel="Lightness"
            align="center"
            inputMode="numeric"
            nudgeStep={1}
            nudgeShiftStep={10}
            scrubbable
            min={0}
            max={100}
          />
        </ChannelTooltip>
        <AlphaInput
          value={alphaPct}
          onCommit={(n) => onChannelChange("alphaPercent", String(n))}
        />
      </div>
    );
  }

  // oklch
  const oklch = rgbToOklch(parsed.r, parsed.g, parsed.b);
  const displayH = oklchHue ?? oklch.H;
  return (
    <div className="grid grid-cols-4 gap-1">
      <ChannelTooltip label="Lightness">
        <ColorInput
          value={(oklch.L * 100).toFixed(0)}
          onCommit={(n) => onChannelChange("L", n)}
          ariaLabel="Lightness"
          align="center"
          inputMode="decimal"
          nudgeStep={1}
          nudgeShiftStep={10}
          scrubbable
          min={0}
          max={100}
        />
      </ChannelTooltip>
      <ChannelTooltip label="Chroma">
        <ColorInput
          value={oklch.C.toFixed(2)}
          onCommit={(n) => onChannelChange("C", n)}
          ariaLabel="Chroma"
          align="center"
          inputMode="decimal"
          nudgeStep={0.01}
          nudgeShiftStep={0.1}
          decimals={2}
          scrubbable
          min={0}
          max={0.4}
        />
      </ChannelTooltip>
      <ChannelTooltip label="Hue">
        <ColorInput
          value={displayH.toFixed(0)}
          onCommit={(n) => onChannelChange("H", n)}
          ariaLabel="Hue"
          align="center"
          inputMode="numeric"
          nudgeStep={1}
          nudgeShiftStep={10}
          scrubbable
          min={0}
          max={360}
          wrap
        />
      </ChannelTooltip>
      <AlphaInput
        value={alphaPct}
        onCommit={(n) => onChannelChange("alphaPercent", String(n))}
      />
    </div>
  );
};

// ---------------------------------------------------------------------------

const SwatchStrip = ({
  swatches,
  current,
  onPick,
}: {
  swatches: string[];
  current: string;
  onPick: (color: string) => void;
}) => {
  const normalizedCurrent = useMemo(() => {
    const p = parseColor(current);
    return p ? rgbToHexStr(p.r, p.g, p.b, p.a).toLowerCase() : "";
  }, [current]);

  // Named CSS colors ("red", "tomato") need the browser to normalize before
  // the selected-state comparison can match. web-ui is a client-only Vite
  // build (see EyeDropperButton above) so the canvas-based resolution in
  // resolveCssColor can run directly during render.
  const resolvedSwatches = useMemo(() => {
    const next: Record<string, string> = {};
    for (const sw of swatches) {
      if (!parseColor(sw)) {
        const p = resolveCssColor(sw);
        if (p) {
          next[sw] = rgbToHexStr(p.r, p.g, p.b, p.a).toLowerCase();
        }
      }
    }
    return next;
  }, [swatches]);

  return (
    <div className="flex flex-wrap gap-2">
      {swatches.map((sw, i) => {
        const parsed = parseColor(sw);
        const normalized = parsed
          ? rgbToHexStr(parsed.r, parsed.g, parsed.b, parsed.a).toLowerCase()
          : (resolvedSwatches[sw] ?? sw.toLowerCase());
        const isSelected = normalized === normalizedCurrent;
        return (
          <ColorSwatch
            key={`${sw}-${i}`}
            color={sw}
            size={28}
            selected={isSelected}
            onClick={() => onPick(sw)}
          />
        );
      })}
    </div>
  );
};

// ---------------------------------------------------------------------------
// ColorPicker (panel)
// ---------------------------------------------------------------------------

const ColorPickerInner: ForwardRefRenderFunction<
  HTMLDivElement,
  ColorPickerProps
> = (
  {
    value,
    defaultValue = "#6366f1",
    onValueChange,
    format,
    defaultFormat = "hex",
    onFormatChange,
    swatches,
    hideEyedropper,
    formatOpen,
    defaultFormatOpen,
    size,
    className,
    ...props
  },
  ref
) => {
  const isControlled = value !== undefined;
  const [internalValue, setInternalValue] = useState(value ?? defaultValue);
  const currentRawValue = isControlled ? (value as string) : internalValue;

  const isFormatControlled = format !== undefined;
  const [internalFormat, setInternalFormat] =
    useState<ColorFormat>(defaultFormat);
  const currentFormat = isFormatControlled
    ? (format as ColorFormat)
    : internalFormat;

  // Internal HSV state (canonical). H is preserved across S=0 / V=0
  // transitions. Deliberately computed once from the initial value only —
  // a lazy initializer so it never re-runs from the render that first
  // captured `currentRawValue`, not a memo of the live value.
  const [hsv, setHsv] = useState(() => {
    const p = parseColor(currentRawValue);
    if (!p) {
      return { a: 1, h: 0, s: 1, v: 1 };
    }
    const initialHsv = rgbToHsv(p.r, p.g, p.b);
    return {
      a: p.a,
      h: initialHsv.s === 0 ? 0 : initialHsv.h,
      s: initialHsv.s,
      v: initialHsv.v,
    };
  });

  // Sticky OKLCH hue: preserves the user's stated OKLCH H across the lossy
  // RGB round-trip (so the displayed H doesn't drift after release) and
  // across achromatic colors (where RGB-derived H would collapse to 0).
  // Cleared whenever the color changes through a non-OKLCH-internal channel.
  const [oklchHue, setOklchHue] = useState<number | null>(null);

  // External value sync — when controlled value changes from outside (and
  // isn't just an echo of this component's own last emit), sync HSV. Done
  // during render by comparing against the previous render's value (React's
  // documented pattern for adjusting state in response to a prop change)
  // rather than in an effect, so the sync lands in the same render as the
  // prop change instead of one render behind it.
  const [lastEmitted, setLastEmitted] = useState("");
  const [lastSyncedValue, setLastSyncedValue] = useState<string | null>(
    isControlled ? (value as string) : null
  );
  if (isControlled && value !== lastSyncedValue) {
    const cur = value as string;
    setLastSyncedValue(cur);
    if (cur !== lastEmitted) {
      const p = parseColor(cur);
      if (p) {
        setOklchHue(null);
        const newHsv = rgbToHsv(p.r, p.g, p.b);
        setHsv((prev) => ({
          a: p.a,
          h: newHsv.s === 0 ? prev.h : newHsv.h,
          s: newHsv.s,
          v: newHsv.v,
        }));
      }
    }
  }

  const parsed = useMemo(() => buildParsed(hsv.h, hsv.s, hsv.v, hsv.a), [hsv]);

  const updateHsv = useCallback(
    (next: { h?: number; s?: number; v?: number; a?: number }) => {
      const merged = { ...hsv, ...next };
      setHsv(merged);
      const p = buildParsed(merged.h, merged.s, merged.v, merged.a);
      const formatted = formatValueByFormat(p, currentFormat);
      setLastEmitted(formatted);
      if (!isControlled) {
        setInternalValue(formatted);
      }
      onValueChange?.(formatted, p);
    },
    [hsv, currentFormat, isControlled, onValueChange]
  );

  const handleFormatChange = useCallback(
    (f: ColorFormat) => {
      if (!isFormatControlled) {
        setInternalFormat(f);
      }
      onFormatChange?.(f);
      // Re-emit value in new format
      const formatted = formatValueByFormat(parsed, f);
      setLastEmitted(formatted);
      if (!isControlled) {
        setInternalValue(formatted);
      }
      onValueChange?.(formatted, parsed);
    },
    [isFormatControlled, isControlled, onFormatChange, onValueChange, parsed]
  );

  const handleHexCommit = useCallback(
    (input: string) => {
      // resolveCssColor falls back to browser normalization so named CSS
      // colors ("red", "tomato") from swatches or the hex field work too.
      // Safe here: this only ever runs inside event handlers.
      const p = resolveCssColor(input);
      if (!p) {
        return;
      }
      setOklchHue(null);
      const newHsv = rgbToHsv(p.r, p.g, p.b);
      const merged = {
        a: p.a,
        h: newHsv.s === 0 ? hsv.h : newHsv.h,
        s: newHsv.s,
        v: newHsv.v,
      };
      setHsv(merged);
      const next = buildParsed(merged.h, merged.s, merged.v, merged.a);
      const formatted = formatValueByFormat(next, currentFormat);
      setLastEmitted(formatted);
      if (!isControlled) {
        setInternalValue(formatted);
      }
      onValueChange?.(formatted, next);
    },
    [hsv.h, currentFormat, isControlled, onValueChange]
  );

  const handleSwatchPick = useCallback(
    (sw: string) => {
      handleHexCommit(sw);
    },
    [handleHexCommit]
  );

  const handleEyedrop = useCallback(
    (hex: string) => {
      handleHexCommit(hex);
    },
    [handleHexCommit]
  );

  const solidHueRgb = useMemo(
    () => hsvToRgb(hsv.h, hsv.s, hsv.v),
    [hsv.h, hsv.s, hsv.v]
  );
  const solidR = Math.round(solidHueRgb.r);
  const solidG = Math.round(solidHueRgb.g);
  const solidB = Math.round(solidHueRgb.b);
  const solidColorString = `rgb(${solidR}, ${solidG}, ${solidB})`;
  const shape = useShape();
  const substrate = useSurface();
  // The picker panel uses bg-card (surface-3) by default; when wrapped in
  // ColorPickerPopover the className override pushes it higher. Either way,
  // announce the panel's effective level so descendants (FormatDropdown,
  // etc.) elevate above it instead of colliding at the same surface.
  const pickerLevel = Math.max(substrate, 3);

  // A size prop pins the whole panel — format dropdown, inputs, eyedropper
  // (React context crosses portals) — to one step of the ladder.
  const root = (
    <SurfaceProvider value={pickerLevel}>
      <div
        ref={ref}
        className={cn(
          "flex flex-col gap-2 p-3",
          surfaceClasses(pickerLevel, 1),
          shape.container,
          className
        )}
        style={{ width: PANEL_WIDTH }}
        {...props}
      >
        <SaturationSquare
          h={hsv.h}
          s={hsv.s}
          v={hsv.v}
          onChange={(s, v) => updateHsv({ s, v })}
        />

        <div className="flex flex-col [&>*]:mb-0 [&>*+*]:-mt-px">
          <HueSlider
            h={hsv.h}
            onChange={(h) => {
              setOklchHue(null);
              updateHsv({ h });
            }}
          />
          <AlphaSlider
            a={hsv.a}
            solidColor={solidColorString}
            solidR={solidR}
            solidG={solidG}
            solidB={solidB}
            onChange={(a) => updateHsv({ a })}
          />
        </div>

        <div className="grid grid-cols-2 gap-2">
          <FormatDropdown
            value={currentFormat}
            onChange={handleFormatChange}
            open={formatOpen}
            defaultOpen={defaultFormatOpen}
          />
          {!hideEyedropper && <EyeDropperButton onPick={handleEyedrop} />}
        </div>

        <ColorInputsRow
          parsed={parsed}
          format={currentFormat}
          oklchHue={oklchHue}
          onChannelChange={(channel, value) => {
            const p = { ...parsed };
            switch (channel) {
              case "hex": {
                handleHexCommit(value as string);
                return;
              }
              case "r":
              case "g":
              case "b": {
                setOklchHue(null);
                const r = channel === "r" ? Number(value) : p.r;
                const g = channel === "g" ? Number(value) : p.g;
                const b = channel === "b" ? Number(value) : p.b;
                const hsvVal = rgbToHsv(r, g, b);
                updateHsv({
                  h: hsvVal.s === 0 ? hsv.h : hsvVal.h,
                  s: hsvVal.s,
                  v: hsvVal.v,
                });
                return;
              }
              case "hSL":
              case "sSL":
              case "lSL": {
                if (channel === "hSL") {
                  setOklchHue(null);
                }
                const hsl = rgbToHsl(p.r, p.g, p.b);
                const h2 = channel === "hSL" ? Number(value) : hsl.h;
                const s2 = channel === "sSL" ? Number(value) / 100 : hsl.s;
                const l2 = channel === "lSL" ? Number(value) / 100 : hsl.l;
                const rgb = hslToRgb(h2, clamp01(s2), clamp01(l2));
                const hsvVal = rgbToHsv(rgb.r, rgb.g, rgb.b);
                updateHsv({
                  h: hsvVal.s === 0 ? h2 : hsvVal.h,
                  s: hsvVal.s,
                  v: hsvVal.v,
                });
                return;
              }
              case "L":
              case "C":
              case "H": {
                const cur = rgbToOklch(p.r, p.g, p.b);
                // For L/C edits, anchor on the user's last stated H so we
                // don't drift along with chroma changes.
                const baseH = oklchHue ?? cur.H;
                const L = channel === "L" ? Number(value) / 100 : cur.L;
                const C = channel === "C" ? Number(value) : cur.C;
                const H = channel === "H" ? Number(value) : baseH;
                setOklchHue(H);
                const rgb = oklchToRgb(clamp01(L), Math.max(0, C), H);
                const hsvVal = rgbToHsv(rgb.r, rgb.g, rgb.b);
                updateHsv({
                  h: hsvVal.s === 0 ? hsv.h : hsvVal.h,
                  s: hsvVal.s,
                  v: hsvVal.v,
                });
                return;
              }
              case "alphaPercent": {
                const a = clamp01(Number(value) / 100);
                updateHsv({ a });
              }
            }
          }}
        />

        {swatches && swatches.length > 0 && (
          <SwatchStrip
            swatches={swatches}
            current={parsed.hex}
            onPick={handleSwatchPick}
          />
        )}
      </div>
    </SurfaceProvider>
  );

  return size ? <SizeProvider size={size}>{root}</SizeProvider> : root;
};

const ColorPicker = forwardRef(ColorPickerInner);

ColorPicker.displayName = "ColorPicker";

// ---------------------------------------------------------------------------

const ColorPickerPopoverInner: ForwardRefRenderFunction<
  HTMLDivElement,
  ColorPickerPopoverProps
> = (
  {
    triggerLabel,
    triggerLabelPosition = "left",
    triggerShowValue = true,
    triggerShowRemove = false,
    onTriggerRemove,
    triggerClassName,
    open: openProp,
    defaultOpen = false,
    onOpenChange,
    size,
    ...pickerProps
  },
  ref
) => {
  const isOpenControlled = openProp !== undefined;
  const [internalOpen, setInternalOpen] = useState(defaultOpen);
  const open = isOpenControlled ? openProp : internalOpen;
  const actionsRef = useRef<{
    unmount: () => void;
    close: () => void;
  } | null>(null);
  const [panelEl, setPanelEl] = useState<HTMLDivElement | null>(null);
  const shape = useShape();
  // Resolved with the override directly: this component's own hooks run
  // outside the SizeProvider it renders, so the trigger can't read the pin
  // from context. The portalled panel inherits it from the provider below
  // (React context crosses portals).
  const sizeClasses = useSize(size);
  const compact = sizeClasses.variant === "compact";
  const substrate = useSurface();
  const level = Math.min(substrate + 2, 8);

  const handleOpenChange = useCallback(
    (next: boolean) => {
      if (!isOpenControlled) {
        setInternalOpen(next);
      }
      onOpenChange?.(next);
    },
    [isOpenControlled, onOpenChange]
  );

  const isControlled = pickerProps.value !== undefined;
  const [internalValue, setInternalValue] = useState(
    pickerProps.value ?? pickerProps.defaultValue ?? "#6366f1"
  );
  const currentValue = isControlled
    ? (pickerProps.value as string)
    : internalValue;

  const handleValueChange = useCallback(
    (v: string, parsed: ParsedColor) => {
      if (!isControlled) {
        setInternalValue(v);
      }
      pickerProps.onValueChange?.(v, parsed);
    },
    [isControlled, pickerProps]
  );

  // Release Base UI's deferred unmount once the exit tween has played.
  // onAnimationComplete on the motion.div is the primary signal; this
  // timeout is a fallback for throttled/background tabs where rAF-driven
  // animation callbacks can stall (spring.moderate.exit is 120ms — 150ms
  // covers it with margin).
  useEffect(() => {
    if (open) {
      return;
    }
    const id = setTimeout(() => actionsRef.current?.unmount(), 150);
    return () => clearTimeout(id);
  }, [open]);

  const XIcon = useIcon("x");
  const parsed = useMemo(() => parseColor(currentValue), [currentValue]);
  const swatchColor = parsed
    ? rgbToHexStr(parsed.r, parsed.g, parsed.b, parsed.a)
    : currentValue;
  const valueLabel = parsed
    ? rgbToHexStr(parsed.r, parsed.g, parsed.b, 1)
        .replace(/^#/u, "")
        .toUpperCase()
    : currentValue;

  // A size prop pins the whole compound (trigger + portalled panel — React
  // context crosses portals) to one step of the ladder.
  const root = (
    <Popover.Root
      open={open}
      onOpenChange={handleOpenChange}
      actionsRef={actionsRef}
      // Non-modal: the page keeps scrolling and the Positioner tracks the
      // anchor, so the panel follows its trigger instead of detaching.
      modal={false}
    >
      <div ref={ref} className="inline-flex">
        <Popover.Trigger
          className={cn(
            "border-border hover:bg-hover focus-visible:ring-ring flex cursor-pointer items-center border bg-transparent transition-colors duration-80 outline-none focus-visible:ring-1",
            sizeClasses.gap,
            sizeClasses.control,
            compact ? "px-1.5" : "px-2",
            shape.input,
            triggerClassName
          )}
          style={{ fontVariationSettings: fontWeights.medium }}
        >
          {triggerLabel && triggerLabelPosition === "left" && (
            <span
              className={cn(
                "text-muted-foreground px-1 select-none",
                sizeClasses.text
              )}
            >
              {triggerLabel}
            </span>
          )}
          <ColorTile color={swatchColor} size={compact ? 16 : 20} />
          {triggerShowValue && (
            <span
              className={cn("text-foreground tabular-nums", sizeClasses.text)}
            >
              {valueLabel}
            </span>
          )}
          {triggerLabel && triggerLabelPosition === "right" && (
            <span
              className={cn(
                "text-muted-foreground px-1 select-none",
                sizeClasses.text
              )}
            >
              {triggerLabel}
            </span>
          )}
          {triggerShowRemove && (
            <span
              role="button"
              aria-label="Remove color"
              tabIndex={0}
              onClick={(e) => {
                e.stopPropagation();
                onTriggerRemove?.();
              }}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.stopPropagation();
                  e.preventDefault();
                  onTriggerRemove?.();
                }
              }}
              className="text-muted-foreground hover:text-foreground ml-1 flex cursor-pointer items-center"
            >
              {
                // See the ChevronDownIcon comment above: useIcon resolves
                // at render time, so this goes through createElement
                // rather than JSX.
                createElement(XIcon, { size: 14, strokeWidth: 1.5 })
              }
            </span>
          )}
        </Popover.Trigger>
        <Popover.Portal>
          <Popover.Positioner
            side="bottom"
            align="start"
            sideOffset={6}
            className="z-50 outline-none"
          >
            <motion.div
              initial={{ opacity: 0, scaleY: 0.96, y: -4 }}
              animate={
                open
                  ? { opacity: 1, scaleY: 1, y: 0 }
                  : { opacity: 0, scaleY: 0.96, y: -4 }
              }
              transition={open ? spring.moderate : spring.moderate.exit}
              style={{ transformOrigin: "top left" }}
              // Base UI defers unmount while actionsRef is set; release it
              // once the exit spring has finished so the close animation
              // fully plays.
              onAnimationComplete={() => {
                if (!open) {
                  actionsRef.current?.unmount();
                }
              }}
            >
              <Popover.Popup
                render={<div ref={setPanelEl} />}
                className="outline-none"
              >
                <ColorPickerPortalContainer value={panelEl}>
                  <SurfaceProvider value={level}>
                    <ColorPicker
                      {...pickerProps}
                      value={currentValue}
                      onValueChange={handleValueChange}
                      className={cn(
                        surfaceClasses(level, 3),
                        pickerProps.className
                      )}
                    />
                  </SurfaceProvider>
                </ColorPickerPortalContainer>
              </Popover.Popup>
            </motion.div>
          </Popover.Positioner>
        </Popover.Portal>
      </div>
    </Popover.Root>
  );

  return size ? <SizeProvider size={size}>{root}</SizeProvider> : root;
};

const ColorPickerPopover = forwardRef(ColorPickerPopoverInner);

ColorPickerPopover.displayName = "ColorPickerPopover";

// ---------------------------------------------------------------------------
// Exports
// ---------------------------------------------------------------------------

export {
  ColorPicker,
  ColorPickerPopover,
  ColorPickerPortalContainer,
  ColorSwatch,
  ColorTile,
  parseColor,
  buildParsed,
};

export type {
  ColorPickerProps,
  ColorPickerPopoverProps,
  ColorSwatchProps,
  ColorFormat,
  ParsedColor,
};
