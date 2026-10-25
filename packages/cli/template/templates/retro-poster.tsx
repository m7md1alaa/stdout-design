import { defineSchema } from "@stdout-design/cli/schema";
import { z } from "zod";

export const templateId = "retro-poster" as const;

export const propsSchema = defineSchema(
  z.object({
    body: z
      .string()
      .default(
        "Ninety minutes, two sides, zero skips. Hand-picked tracks, hand-written labels, and a pencil for when the tape gets tangled."
      )
      .describe("Short paragraph beside the target mark"),
    headline: z
      .string()
      .min(1)
      .default("Mixtape Club")
      .describe("Stacked headline in the bottom corner — one word per line"),
    label: z
      .string()
      .default("Summer mix '89")
      .describe("Handwritten title on the cassette label"),
    locale: z
      .string()
      .optional()
      .describe("Current locale code for RTL support"),
    paper: z.string().default("#efe6d2").describe("Poster paper color"),
    stamp: z
      .string()
      .default("Limited edition")
      .describe("Rubber-stamp headline"),
    stampNote: z
      .string()
      .default("No. 0042 / 5000")
      .describe("Small line inside the stamp"),
    tagline: z
      .string()
      .default("Analog since forever")
      .describe("Small line under the headline"),
    title: z
      .string()
      .default("Press Play")
      .describe("Oversized title across the top"),
  })
);

export type Props = z.infer<typeof propsSchema>;

const INK = "#1d1a17";
const SHELL = "#2e2b35";
const RUST = "#d9532c";
// Latin face first; Arabic glyphs fall through to the Arabic face.
const TITLE = "Anton, Lalezar, sans-serif";
const DISPLAY = "Archivo Black, Lalezar, sans-serif";
const SCRIPT = "Instrument Serif, Amiri, serif";
const MONO = "Space Mono, IBM Plex Sans Arabic, monospace";
const STRIPES = ["#7a2e3a", RUST, "#f0a830", "#2f8f83"];
const BARCODE = [
  3, 1, 2, 1, 1, 3, 1, 2, 2, 1, 3, 1, 1, 2, 1, 3, 2, 1, 1, 2, 3, 1, 2, 1,
];
const BAR_UNIT = 1.6;
// Fixed, not fluid: on short canvases the stripes simply run off the
// bottom edge instead of the cassette squashing.
const CASSETTE_WIDTH = 420;
const CASSETTE_HEIGHT = 270;
const REEL_TEETH = [0, 60, 120, 180, 240, 300];

const Reel = ({ cx }: { cx: number }) => (
  <g>
    <circle cx={cx} cy="0" r="26" fill="#f6efe0" stroke={INK} strokeWidth="3" />
    <circle cx={cx} cy="0" r="12" fill={SHELL} />
    {REEL_TEETH.map((angle) => (
      <rect
        key={angle}
        x={cx - 2.5}
        y="-12"
        width="5"
        height="6"
        fill="#f6efe0"
        transform={`rotate(${angle} ${cx} 0)`}
      />
    ))}
  </g>
);

const Cassette = ({ label, isRtl }: { label: string; isRtl: boolean }) => (
  <div
    tw="flex relative"
    style={{
      flexShrink: 0,
      height: CASSETTE_HEIGHT,
      transform: `rotate(${isRtl ? 6 : -6}deg)`,
      width: CASSETTE_WIDTH,
    }}
  >
    <svg
      width={CASSETTE_WIDTH}
      height={CASSETTE_HEIGHT}
      viewBox="0 0 420 270"
      style={{ left: 0, position: "absolute", top: 0 }}
    >
      {/* Offset print shadow, then the shell */}
      <rect x="12" y="12" width="406" height="256" rx="22" fill={INK} />
      <rect
        x="2"
        y="2"
        width="406"
        height="256"
        rx="22"
        fill={SHELL}
        stroke={INK}
        strokeWidth="4"
      />
      {[22, 386].map((x) => (
        <g key={x}>
          <circle cx={x} cy="22" r="6" fill="#1a181f" />
          <circle cx={x} cy="238" r="6" fill="#1a181f" />
        </g>
      ))}
      {/* Label */}
      <rect x="34" y="28" width="342" height="150" rx="10" fill="#f6efe0" />
      <rect x="34" y="28" width="342" height="26" rx="10" fill={RUST} />
      <rect x="34" y="44" width="342" height="10" fill={RUST} />
      {/* Window */}
      <rect
        x="110"
        y="96"
        width="190"
        height="62"
        rx="31"
        fill={SHELL}
        stroke={INK}
        strokeWidth="3"
      />
      <rect x="150" y="112" width="110" height="30" fill="#6b5a4a" />
      <g transform="translate(0 127)">
        <Reel cx={142} />
        <Reel cx={268} />
      </g>
      {/* Bottom bevel */}
      <path
        d="M86 258 L110 206 H300 L324 258 Z"
        fill="#3a3642"
        stroke={INK}
        strokeWidth="3"
      />
      {[150, 182, 228, 260].map((x) => (
        <circle key={x} cx={x} cy="232" r="6" fill="#1a181f" />
      ))}
    </svg>
    {/* Text overlays sit outside the SVG so they use the loaded fonts. */}
    <span
      tw="absolute"
      style={{
        color: "#fff6e5",
        fontFamily: DISPLAY,
        fontSize: 18,
        left: 46,
        top: 29,
      }}
    >
      A
    </span>
    <span
      tw="absolute"
      style={{
        color: "#fff6e5",
        fontFamily: MONO,
        fontSize: 14,
        right: 58,
        top: 32,
      }}
    >
      C-90
    </span>
    <div
      tw="flex absolute justify-center"
      style={{ left: 40, right: 50, top: 54 }}
    >
      <span
        style={{
          color: INK,
          fontFamily: SCRIPT,
          fontSize: 36,
          fontStyle: isRtl ? "normal" : "italic",
          lineHeight: 1.1,
        }}
      >
        {label}
      </span>
    </div>
  </div>
);

const Barcode = () => {
  let x = 0;
  const bars: { x: number; width: number }[] = [];
  for (const [index, units] of BARCODE.entries()) {
    if (index % 2 === 0) {
      bars.push({ width: units * BAR_UNIT, x });
    }
    x += units * BAR_UNIT + 0.8;
  }
  return (
    <svg width="120" height="34" viewBox="0 0 120 34">
      {bars.map((bar) => (
        <rect
          key={bar.x}
          x={bar.x}
          y="0"
          width={bar.width}
          height="34"
          fill={INK}
        />
      ))}
    </svg>
  );
};

const RetroPoster = ({
  body,
  headline,
  label,
  locale,
  paper,
  stamp,
  stampNote,
  tagline,
  title,
}: Props) => {
  const isRtl = locale?.startsWith("ar") ?? false;
  // Flex rows mirror themselves under dir="rtl"; absolute offsets don't.
  const start = isRtl ? "right" : "left";
  const words = headline.split(/\s+/u).filter(Boolean);

  return (
    <div
      lang={isRtl ? "ar" : undefined}
      dir={isRtl ? "rtl" : "ltr"}
      tw="flex flex-col w-full h-full px-12 pt-10 relative overflow-hidden"
      style={{ backgroundColor: paper, color: INK, fontFamily: MONO }}
    >
      {/* Paper grain */}
      <div
        tw="absolute inset-0"
        style={{
          backgroundImage:
            "radial-gradient(rgba(29,26,23,0.07) 1px, transparent 1.5px)",
          backgroundSize: "7px 7px",
        }}
      />

      <span
        tw="relative"
        style={{
          fontFamily: TITLE,
          fontSize: isRtl ? 104 : 124,
          lineHeight: isRtl ? 1.1 : 0.9,
          textTransform: "uppercase",
        }}
      >
        {title}
      </span>
      <div
        tw="flex relative my-5"
        style={{ backgroundColor: INK, flexShrink: 0, height: 4 }}
      />

      {/* minHeight 0: the fixed-size cassette and stripes may overflow this
          row, but must not stretch it (and the text column) past the canvas. */}
      <div tw="flex flex-1 relative" style={{ gap: 40, minHeight: 0 }}>
        {/* Tape stripes run out of the cassette and off the page */}
        <div
          tw="flex absolute"
          style={{ bottom: 0, [start]: 120, top: CASSETTE_HEIGHT - 50 }}
        >
          {STRIPES.map((color) => (
            <div
              key={color}
              tw="h-full w-10"
              style={{ backgroundColor: color }}
            />
          ))}
        </div>

        <div tw="flex pt-2">
          <Cassette label={label} isRtl={isRtl} />
        </div>

        <div tw="flex flex-col flex-1 justify-between items-end pb-8 relative">
          <div tw="flex items-start" style={{ gap: 28 }}>
            <div
              tw="flex rounded-full"
              style={{
                backgroundImage: `repeating-radial-gradient(circle, ${INK} 0 8px, transparent 8px 16px)`,
                flexShrink: 0,
                height: 104,
                width: 104,
              }}
            />
            <div
              tw="flex text-base"
              style={{
                [isRtl ? "borderRight" : "borderLeft"]: `3px solid ${INK}`,
                [isRtl ? "paddingRight" : "paddingLeft"]: 20,
                lineHeight: 1.55,
                width: 330,
              }}
            >
              {body}
            </div>
          </div>

          <div
            tw="flex flex-col absolute px-5 py-3"
            style={{
              border: `4px solid ${RUST}`,
              color: RUST,
              opacity: 0.92,
              [start]: 20,
              top: "40%",
              transform: `rotate(${isRtl ? 8 : -8}deg)`,
            }}
          >
            <span
              style={{
                fontFamily: DISPLAY,
                fontSize: 30,
                lineHeight: 1.1,
                textTransform: "uppercase",
              }}
            >
              {stamp}
            </span>
            <span
              tw="text-base mt-1"
              style={{ letterSpacing: isRtl ? 0 : "0.2em" }}
            >
              {stampNote}
            </span>
          </div>

          <div tw="flex flex-col items-end">
            {words.map((word, index) => (
              <span
                key={`${word}-${index}`}
                style={{
                  fontFamily: DISPLAY,
                  fontSize: isRtl ? 84 : 92,
                  letterSpacing: isRtl ? 0 : "-0.04em",
                  lineHeight: isRtl ? 1.15 : 0.9,
                  textTransform: "uppercase",
                }}
              >
                {word}
              </span>
            ))}
            <div tw="flex items-center mt-4" style={{ gap: 20 }}>
              <Barcode />
              <span tw="text-2xl" style={{ fontWeight: 700 }}>
                {tagline}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default RetroPoster;
