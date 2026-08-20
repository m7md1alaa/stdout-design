/**
 * Hex <-> HSL conversion for the color field's hue/saturation/lightness
 * sliders, plus a thin wrapper around the browser's EyeDropper API (not yet
 * in TypeScript's DOM lib, so it's typed locally below).
 */

const HEX_RE = /^#(?<digits>[0-9a-f]{6})$/iu;

export const isValidHex = (value: string): boolean => HEX_RE.test(value);

export interface Hsl {
  h: number;
  s: number;
  l: number;
}

export const hexToHsl = (hex: string): Hsl => {
  if (!HEX_RE.test(hex)) {
    return { h: 0, l: 0, s: 0 };
  }

  const r = Number.parseInt(hex.slice(1, 3), 16) / 255;
  const g = Number.parseInt(hex.slice(3, 5), 16) / 255;
  const b = Number.parseInt(hex.slice(5, 7), 16) / 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const l = (max + min) / 2;

  if (max === min) {
    return { h: 0, l: l * 100, s: 0 };
  }

  const d = max - min;
  const s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
  let h: number;
  if (max === r) {
    h = ((g - b) / d + (g < b ? 6 : 0)) * 60;
  } else if (max === g) {
    h = ((b - r) / d + 2) * 60;
  } else {
    h = ((r - g) / d + 4) * 60;
  }

  return { h, l: l * 100, s: s * 100 };
};

const channelToHex = (channel: number): string =>
  Math.round(channel * 255)
    .toString(16)
    .padStart(2, "0");

export const hslToHex = (h: number, s: number, l: number): string => {
  const sNorm = s / 100;
  const lNorm = l / 100;
  const c = (1 - Math.abs(2 * lNorm - 1)) * sNorm;
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
  const m = lNorm - c / 2;

  let rgb: [number, number, number];
  if (h < 60) {
    rgb = [c, x, 0];
  } else if (h < 120) {
    rgb = [x, c, 0];
  } else if (h < 180) {
    rgb = [0, c, x];
  } else if (h < 240) {
    rgb = [0, x, c];
  } else if (h < 300) {
    rgb = [x, 0, c];
  } else {
    rgb = [c, 0, x];
  }

  const [r, g, b] = rgb;
  return `#${channelToHex(r + m)}${channelToHex(g + m)}${channelToHex(b + m)}`;
};

interface EyeDropperResult {
  sRGBHex: string;
}

interface EyeDropperInstance {
  open: (options?: { signal?: AbortSignal }) => Promise<EyeDropperResult>;
}

type EyeDropperConstructor = new () => EyeDropperInstance;

declare global {
  interface Window {
    EyeDropper?: EyeDropperConstructor;
  }
}

export const supportsEyeDropper = (): boolean =>
  typeof window !== "undefined" && "EyeDropper" in window;

/** Opens the browser's EyeDropper; resolves to null if unsupported or cancelled. */
export const pickColorFromScreen = async (): Promise<string | null> => {
  if (!window.EyeDropper) {
    return null;
  }
  try {
    const result = await new window.EyeDropper().open();
    return result.sRGBHex;
  } catch {
    // User cancelled (Escape) — not an error.
    return null;
  }
};
