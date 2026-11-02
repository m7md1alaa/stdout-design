/** A color as 0–255 channels plus 0–1 alpha. */
export interface Rgba {
  r: number;
  g: number;
  b: number;
  a: number;
}

/** Hue 0–360, saturation and value 0–1. */
export interface Hsv {
  h: number;
  s: number;
  v: number;
}

const HEX = /^#(?<digits>[\da-f]{3,4}|[\da-f]{6}|[\da-f]{8})$/iu;
const BYTE = 255;
const HEX_RADIX = 16;
const HUE_SECTORS = 6;
const FULL_TURN = 360;

const expand = (digits: string): string =>
  digits.length <= 4
    ? [...digits].map((digit) => digit + digit).join("")
    : digits;

/** Parses `#rgb`, `#rgba`, `#rrggbb` or `#rrggbbaa`. `null` for anything else. */
export const parseHex = (input: string): Rgba | null => {
  const digits = HEX.exec(input.trim())?.groups?.digits;
  if (!digits) {
    return null;
  }
  const full = expand(digits);
  const channel = (start: number): number =>
    Number.parseInt(full.slice(start, start + 2), HEX_RADIX);
  return {
    a: full.length === 8 ? channel(6) / BYTE : 1,
    b: channel(4),
    g: channel(2),
    r: channel(0),
  };
};

const byteHex = (value: number): string =>
  Math.round(Math.min(BYTE, Math.max(0, value)))
    .toString(HEX_RADIX)
    .padStart(2, "0");

/** `#rrggbb`, with `aa` appended only when the color is translucent. */
export const toHex = ({ r, g, b, a }: Rgba): string =>
  `#${byteHex(r)}${byteHex(g)}${byteHex(b)}${a < 1 ? byteHex(a * BYTE) : ""}`;

export const rgbToHsv = ({ r, g, b }: Rgba): Hsv => {
  const [rn, gn, bn] = [r / BYTE, g / BYTE, b / BYTE];
  const max = Math.max(rn, gn, bn);
  const delta = max - Math.min(rn, gn, bn);
  let sector = 0;
  if (delta !== 0) {
    if (max === rn) {
      sector = ((gn - bn) / delta + HUE_SECTORS) % HUE_SECTORS;
    } else if (max === gn) {
      sector = (bn - rn) / delta + 2;
    } else {
      sector = (rn - gn) / delta + 4;
    }
  }
  return {
    h: (sector * FULL_TURN) / HUE_SECTORS,
    s: max === 0 ? 0 : delta / max,
    v: max,
  };
};

export const hsvToRgb = ({ h, s, v }: Hsv, a = 1): Rgba => {
  const sector = (((h % FULL_TURN) + FULL_TURN) % FULL_TURN) / 60;
  const channel = (offset: number): number => {
    const k = (offset + sector) % HUE_SECTORS;
    return (v - v * s * Math.max(0, Math.min(k, 4 - k, 1))) * BYTE;
  };
  return { a, b: channel(1), g: channel(3), r: channel(5) };
};
