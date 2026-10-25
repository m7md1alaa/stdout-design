import { defineSchema } from "@stdout-design/cli/schema";
import { z } from "zod";

export const templateId = "trend-poster" as const;

export const propsSchema = defineSchema(
  z.object({
    aside: z
      .string()
      .default("to steal & remix")
      .describe("Serif aside next to the edition"),
    cta: z
      .string()
      .default("Save for later")
      .describe("Button label in the footer"),
    edition: z
      .string()
      .default("2027")
      .describe("Big outlined word under the headline"),
    footer: z
      .string()
      .default("Make the thumb stop.")
      .describe("Serif line in the footer"),
    headline: z
      .string()
      .min(1)
      .default("Ways to stop the scroll")
      .describe("Headline — prefixed with the number of items"),
    highlight: z
      .string()
      .default("#ff6a3d")
      .describe("Highlight color for the edition and button"),
    issue: z.string().default("Issue 07").describe("Small label top-start"),
    items: z
      .array(z.string())
      .default([
        "Loud type",
        "Halftone",
        "Clashing color",
        "Raw collage",
        "Stickers",
        "Big shapes",
      ])
      .describe("Six item names, one per grid cell"),
    locale: z
      .string()
      .optional()
      .describe("Current locale code for RTL support"),
    strap: z
      .string()
      .default("A field guide for the feed")
      .describe("Small line top-end"),
  })
);

export type Props = z.infer<typeof propsSchema>;

const INK = "#121212";
const PAPER = "#efece4";
const COBALT = "#3046ff";
// Latin face first; Arabic glyphs fall through to the Arabic face.
const TITLE = "Anton, Lalezar, sans-serif";
const HEAVY = "Archivo Black, Lalezar, sans-serif";
const SERIF = "Instrument Serif, Amiri, serif";
const MONO = "Space Mono, IBM Plex Sans Arabic, monospace";
const CELLS_PER_ROW = 3;
const SPECIMEN_SIZE = 120;

const starburst = (spikes: number, outer: number, inner: number): string =>
  Array.from({ length: spikes * 2 }, (_, index) => {
    const radius = index % 2 === 0 ? outer : inner;
    const angle = (Math.PI * index) / spikes - Math.PI / 2;
    return `${50 + radius * Math.cos(angle)},${50 + radius * Math.sin(angle)}`;
  }).join(" ");

const Sparkle = ({ color }: { color: string }) => (
  <svg width="16" height="16" viewBox="0 0 24 24">
    <path d="M12 0 15 9 24 12 15 15 12 24 9 15 0 12 9 9Z" fill={color} />
  </svg>
);

/** One small specimen per cell, picked by position so any six labels work. */
const Specimen = ({
  highlight,
  index,
}: {
  highlight: string;
  index: number;
}) => {
  switch (index % 6) {
    case 0: {
      return (
        <div
          tw="flex items-center justify-center rounded-full"
          style={{
            backgroundColor: COBALT,
            height: SPECIMEN_SIZE,
            width: SPECIMEN_SIZE,
          }}
        >
          <span
            style={{
              color: PAPER,
              fontFamily: HEAVY,
              fontSize: 60,
              lineHeight: 1,
            }}
          >
            Aa
          </span>
        </div>
      );
    }
    case 1: {
      return (
        <div
          tw="flex"
          style={{
            backgroundImage: `radial-gradient(${INK} 34%, transparent 36%)`,
            backgroundSize: "10px 10px",
            borderRadius: "60px 60px 0 60px",
            height: SPECIMEN_SIZE,
            width: SPECIMEN_SIZE,
          }}
        />
      );
    }
    case 2: {
      return (
        <svg width={SPECIMEN_SIZE} height={SPECIMEN_SIZE} viewBox="0 0 100 100">
          <rect width="100" height="50" fill={highlight} />
          <rect y="50" width="100" height="50" fill={COBALT} />
          <circle
            cx="50"
            cy="50"
            r="24"
            fill="#f5c3ff"
            stroke={INK}
            strokeWidth="3"
          />
        </svg>
      );
    }
    case 3: {
      return (
        <div
          tw="flex relative"
          style={{ height: SPECIMEN_SIZE, width: SPECIMEN_SIZE + 20 }}
        >
          <div
            tw="flex absolute"
            style={{
              backgroundColor: COBALT,
              height: 70,
              left: 0,
              top: 10,
              transform: "rotate(-8deg)",
              width: 90,
            }}
          />
          <div
            tw="flex absolute"
            style={{
              backgroundColor: "#fff",
              border: `2px solid ${INK}`,
              height: 70,
              left: 40,
              top: 40,
              transform: "rotate(6deg)",
              width: 90,
            }}
          />
          <div
            tw="flex absolute"
            style={{
              backgroundColor: highlight,
              height: 18,
              left: 60,
              top: 32,
              transform: "rotate(-20deg)",
              width: 50,
            }}
          />
        </div>
      );
    }
    case 4: {
      return (
        <svg width={SPECIMEN_SIZE} height={SPECIMEN_SIZE} viewBox="0 0 100 100">
          <polygon
            points={starburst(10, 48, 30)}
            fill={highlight}
            stroke={INK}
            strokeWidth="3"
          />
          <circle
            cx="50"
            cy="50"
            r="13"
            fill={PAPER}
            stroke={INK}
            strokeWidth="3"
          />
        </svg>
      );
    }
    default: {
      return (
        <svg width={SPECIMEN_SIZE} height={SPECIMEN_SIZE} viewBox="0 0 100 100">
          <path d="M0 100 V50 A50 50 0 0 1 50 0 H100 V100Z" fill={INK} />
          <circle cx="66" cy="66" r="20" fill={highlight} />
        </svg>
      );
    }
  }
};

const TrendPoster = ({
  aside,
  cta,
  edition,
  footer,
  headline,
  highlight,
  issue,
  items,
  locale,
  strap,
}: Props) => {
  const isRtl = locale?.startsWith("ar") ?? false;
  // Flex rows mirror themselves under dir="rtl"; absolute offsets don't.
  const end = isRtl ? "left" : "right";
  const rows = [
    items.slice(0, CELLS_PER_ROW),
    items.slice(CELLS_PER_ROW, CELLS_PER_ROW * 2),
  ];

  return (
    <div
      lang={isRtl ? "ar" : undefined}
      dir={isRtl ? "rtl" : "ltr"}
      tw="flex flex-col w-full h-full px-12 py-10"
      style={{ backgroundColor: PAPER, color: INK, fontFamily: MONO }}
    >
      <div
        tw="flex items-center justify-between text-lg mb-3"
        style={{ flexShrink: 0 }}
      >
        <div tw="flex items-center" style={{ gap: 12 }}>
          <span style={{ fontWeight: 700 }}>STDOUT</span>
          <Sparkle color={INK} />
          <span>{issue.toUpperCase()}</span>
        </div>
        <span>{strap.toUpperCase()}</span>
      </div>

      <div tw="flex flex-col" style={{ flexShrink: 0 }}>
        <span
          style={{
            fontFamily: TITLE,
            fontSize: isRtl ? 92 : 96,
            lineHeight: isRtl ? 1.2 : 0.9,
            textTransform: "uppercase",
          }}
        >
          {`${items.length} ${headline}`}
        </span>
        <div tw="flex items-end" style={{ gap: 24 }}>
          <span
            style={{
              WebkitTextStroke: `3px ${INK}`,
              color: highlight,
              fontFamily: HEAVY,
              fontSize: 104,
              letterSpacing: isRtl ? 0 : "-0.04em",
              lineHeight: 1,
              textShadow: `5px 5px 0 ${INK}`,
            }}
          >
            {edition}
          </span>
          <span
            tw="mb-3"
            style={{
              fontFamily: SERIF,
              fontSize: 42,
              fontStyle: isRtl ? "normal" : "italic",
            }}
          >
            {aside}
          </span>
        </div>
      </div>

      <div tw="flex flex-col flex-1 mt-5" style={{ minHeight: 0 }}>
        {rows.map((row, rowIndex) => (
          <div
            key={`row-${rowIndex}`}
            tw="flex flex-1"
            style={{ borderTop: `3px solid ${INK}`, minHeight: 0 }}
          >
            {row.map((item, cellIndex) => {
              const index = rowIndex * CELLS_PER_ROW + cellIndex;
              return (
                <div
                  key={item}
                  tw="flex flex-col flex-1 pt-3 relative overflow-hidden"
                  style={{
                    [isRtl ? "borderRight" : "borderLeft"]:
                      cellIndex === 0 ? "none" : `2px solid ${INK}`,
                    [isRtl ? "paddingRight" : "paddingLeft"]:
                      cellIndex === 0 ? 0 : 18,
                  }}
                >
                  {/* Anchored to the bottom corner: short canvases crop it
                      like a print bleed. Rendered first so the label paints
                      on top if they meet. */}
                  <div tw="flex absolute" style={{ bottom: 14, [end]: 18 }}>
                    <Specimen highlight={highlight} index={index} />
                  </div>
                  <div tw="flex items-baseline relative" style={{ gap: 12 }}>
                    <span tw="text-2xl" style={{ fontWeight: 700 }}>
                      {String(index + 1).padStart(2, "0")}
                    </span>
                    <span
                      tw="px-1"
                      style={{
                        backgroundColor: PAPER,
                        fontFamily: HEAVY,
                        fontSize: 20,
                        textTransform: "uppercase",
                      }}
                    >
                      {item}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        ))}
      </div>

      <div
        tw="flex items-center justify-between pt-5"
        style={{ borderTop: `3px solid ${INK}`, flexShrink: 0 }}
      >
        <span style={{ fontFamily: SERIF, fontSize: 40, lineHeight: 1.1 }}>
          {footer}
        </span>
        <div
          tw="flex items-center px-6 py-3 rounded-full"
          style={{
            backgroundColor: highlight,
            border: `3px solid ${INK}`,
            fontFamily: HEAVY,
            fontSize: 20,
            gap: 12,
          }}
        >
          <span>{cta.toUpperCase()}</span>
          <svg
            width="22"
            height="22"
            viewBox="0 0 24 24"
            fill="none"
            style={{ transform: isRtl ? "scaleX(-1)" : "none" }}
          >
            <path
              d="M4 12h15M13 5l7 7-7 7"
              stroke={INK}
              strokeWidth="3"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </div>
      </div>
    </div>
  );
};

export default TrendPoster;
