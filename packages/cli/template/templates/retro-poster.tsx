import {
  defineTemplate,
  field,
  halftone,
  keyed,
  words,
} from "@stdout-design/cli/template";
import type { RenderContext } from "@stdout-design/cli/template";

const INK = "#1d1a17";
const SHELL = "#2e2b35";
const RUST = "#d9532c";
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

// The cassette art is a picture, not a layout: it never mirrors, so the
// labels printed on it keep physical left and right offsets.
const Cassette = ({ label, ctx }: { label: string; ctx: RenderContext }) => (
  <div
    tw="flex relative"
    style={{
      flexShrink: 0,
      height: CASSETTE_HEIGHT,
      transform: `rotate(${ctx.flip(-6)}deg)`,
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
        fontFamily: ctx.fonts.display,
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
        fontFamily: ctx.fonts.mono,
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
          ...ctx.type({ font: "script", italic: true, leading: 1.1, size: 36 }),
          color: INK,
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

// oxlint-disable-next-line sort-keys -- schema reads before the render that uses it
export default defineTemplate({
  // Latin face first; Arabic glyphs fall through to the Arabic face.
  fonts: {
    display: { faces: ["Archivo Black", "Lalezar"] },
    mono: {
      faces: [
        { family: "Space Mono", weights: [400, 700] },
        { family: "IBM Plex Sans Arabic", weights: [400, 700] },
      ],
      generic: "monospace",
    },
    script: { faces: ["Instrument Serif", "Amiri"], generic: "serif" },
    title: { faces: ["Anton", "Lalezar"] },
  },
  schema: {
    body: field.text(
      "Ninety minutes, two sides, zero skips. Hand-picked tracks, hand-written labels, and a pencil for when the tape gets tangled.",
      { description: "Short paragraph beside the target mark", multiline: true }
    ),
    headline: field.text("Mixtape Club", {
      description: "Stacked headline in the bottom corner, one word per line",
      min: 1,
    }),
    label: field.text("Summer mix '89", {
      description: "Handwritten title on the cassette label",
    }),
    paper: field.color("#efe6d2", { description: "Poster paper color" }),
    stamp: field.text("Limited edition", {
      description: "Rubber-stamp headline",
    }),
    stampNote: field.text("No. 0042 / 5000", {
      description: "Small line inside the stamp",
    }),
    tagline: field.text("Analog since forever", {
      description: "Small line under the headline",
    }),
    title: field.text("Press Play", {
      description: "Oversized title across the top",
    }),
  },
  inspector: [
    ["Content", ["title", "headline", "tagline", "body"]],
    ["Stamp", ["label", "stamp", "stampNote"]],
    ["Colors", ["paper"]],
  ],
  render: (props, ctx) => (
    <div
      tw="flex flex-col w-full h-full px-12 pt-10 relative overflow-hidden"
      style={{
        backgroundColor: props.paper,
        color: INK,
        fontFamily: ctx.fonts.mono,
      }}
    >
      {/* Paper grain */}
      <div
        tw="absolute inset-0"
        style={halftone({
          color: "rgba(29,26,23,0.07)",
          dot: 0.15,
          spacing: 7,
        })}
      />

      <span
        tw="relative"
        style={ctx.type({
          font: "title",
          leading: 0.9,
          size: 124,
          uppercase: true,
        })}
      >
        {props.title}
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
          style={{
            bottom: 0,
            insetInlineStart: 120,
            top: CASSETTE_HEIGHT - 50,
          }}
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
          <Cassette ctx={ctx} label={props.label} />
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
                borderInlineStart: `3px solid ${INK}`,
                lineHeight: 1.55,
                paddingInlineStart: 20,
                width: 330,
              }}
            >
              {props.body}
            </div>
          </div>

          <div
            tw="flex flex-col absolute px-5 py-3"
            style={{
              border: `4px solid ${RUST}`,
              color: RUST,
              insetInlineStart: 20,
              opacity: 0.92,
              top: "40%",
              transform: `rotate(${ctx.flip(-8)}deg)`,
            }}
          >
            <span
              style={ctx.type({
                font: "display",
                leading: 1.1,
                size: 30,
                uppercase: true,
              })}
            >
              {props.stamp}
            </span>
            <span tw="text-base mt-1" style={ctx.type({ tracking: 0.2 })}>
              {props.stampNote}
            </span>
          </div>

          <div tw="flex flex-col items-end">
            {keyed(words(props.headline)).map((word) => (
              <span
                key={word.key}
                style={ctx.type({
                  font: "display",
                  leading: 0.9,
                  size: 92,
                  tracking: -0.04,
                  uppercase: true,
                })}
              >
                {word.value}
              </span>
            ))}
            <div tw="flex items-center mt-4" style={{ gap: 20 }}>
              <Barcode />
              <span tw="text-2xl" style={{ fontWeight: 700 }}>
                {props.tagline}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  ),
});
