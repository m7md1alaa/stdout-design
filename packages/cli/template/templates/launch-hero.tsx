import { defineSchema } from "@stdout-design/cli/schema";
import { z } from "zod";

export const templateId = "launch-hero" as const;

export const propsSchema = defineSchema(
  z.object({
    accentColor: z
      .string()
      .default("#2b3bff")
      .describe("Page background color"),
    badge: z
      .string()
      .default("Drop 07")
      .describe("Text on the starburst sticker"),
    brand: z.string().default("OFFBEAT®").describe("Wordmark in the nav bar"),
    categories: z
      .array(z.string())
      .default(["Tees", "Hoodies", "Caps"])
      .describe("Three category card labels"),
    cta: z.string().default("Shop now").describe("Primary button label"),
    headline: z
      .string()
      .min(1)
      .default("Wear It Loud")
      .describe("Hero headline — each word gets its own line"),
    links: z
      .array(z.string())
      .default(["Drops", "Archive", "Club"])
      .describe("Nav bar links"),
    locale: z
      .string()
      .optional()
      .describe("Current locale code for RTL support"),
    note: z
      .string()
      .default("Ships worldwide")
      .describe("Small note at the end of the stats strip"),
    stats: z
      .array(z.string())
      .default(["12 drops a year", "0 restocks", "100% cotton"])
      .describe("Stats strip — the first word is the big number"),
    subheadline: z
      .string()
      .default("Small-batch streetwear, printed in a city that never whispers.")
      .describe("Supporting line under the headline"),
  })
);

export type Props = z.infer<typeof propsSchema>;

const INK = "#0e0e12";
const CREAM = "#fff6e5";
const PINK = "#ff4fa3";
const LIME = "#c8f560";
// Latin face first; Arabic glyphs fall through to the Arabic face.
const DISPLAY = "Archivo Black, Lalezar, sans-serif";
const MONO = "Space Mono, IBM Plex Sans Arabic, monospace";
const CARD_STYLES = [
  { art: "bolt", color: CREAM, tilt: -5 },
  { art: "spiral", color: PINK, tilt: 4 },
  { art: "eye", color: LIME, tilt: -2 },
] as const;

type Art = (typeof CARD_STYLES)[number]["art"];

const starburst = (spikes: number, outer: number, inner: number): string =>
  Array.from({ length: spikes * 2 }, (_, index) => {
    const radius = index % 2 === 0 ? outer : inner;
    const angle = (Math.PI * index) / spikes - Math.PI / 2;
    return `${50 + radius * Math.cos(angle)},${50 + radius * Math.sin(angle)}`;
  }).join(" ");

// Arrows and sparkles are drawn, not typed: display faces rarely ship
// those glyphs, and a missing glyph renders as tofu.
const Arrow = ({ color, flip }: { color: string; flip: boolean }) => (
  <svg
    width="22"
    height="22"
    viewBox="0 0 24 24"
    fill="none"
    style={{ transform: flip ? "scaleX(-1)" : "none" }}
  >
    <path
      d="M4 12h15M13 5l7 7-7 7"
      stroke={color}
      strokeWidth="3"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

const Sparkle = ({ color }: { color: string }) => (
  <svg width="18" height="18" viewBox="0 0 24 24">
    <path d="M12 0 15 9 24 12 15 15 12 24 9 15 0 12 9 9Z" fill={color} />
  </svg>
);

const CardArt = ({ art }: { art: Art }) => {
  if (art === "bolt") {
    return (
      <svg width="110" height="130" viewBox="0 0 80 100">
        <path
          d="M48 2 8 58h26l-6 40 44-60H44Z"
          fill={LIME}
          stroke={INK}
          strokeWidth="5"
          strokeLinejoin="round"
        />
      </svg>
    );
  }
  if (art === "spiral") {
    return (
      <svg width="130" height="130" viewBox="0 0 100 100">
        <path
          d="M50 50m0 0a6 6 0 0 1 12 0a12 12 0 0 1-24 0a18 18 0 0 1 36 0a24 24 0 0 1-48 0a30 30 0 0 1 60 0a36 36 0 0 1-72 0"
          fill="none"
          stroke={INK}
          strokeWidth="6"
          strokeLinecap="round"
        />
      </svg>
    );
  }
  return (
    <svg width="140" height="100" viewBox="0 0 140 100">
      <path
        d="M6 50Q70-14 134 50Q70 114 6 50Z"
        fill={CREAM}
        stroke={INK}
        strokeWidth="6"
      />
      <circle
        cx="70"
        cy="50"
        r="22"
        fill="#2b3bff"
        stroke={INK}
        strokeWidth="5"
      />
      <circle cx="70" cy="50" r="9" fill={INK} />
    </svg>
  );
};

const LaunchHero = ({
  accentColor,
  badge,
  brand,
  categories,
  cta,
  headline,
  links,
  locale,
  note,
  stats,
  subheadline,
}: Props) => {
  const isRtl = locale?.startsWith("ar") ?? false;
  // Flex rows mirror themselves under dir="rtl"; absolute offsets don't.
  const start = isRtl ? "right" : "left";
  const end = isRtl ? "left" : "right";
  const marginStart = isRtl ? "marginRight" : "marginLeft";
  const words = headline.split(/\s+/u).filter(Boolean);

  return (
    <div
      lang={isRtl ? "ar" : undefined}
      dir={isRtl ? "rtl" : "ltr"}
      tw="flex flex-col w-full h-full overflow-hidden relative"
      style={{ backgroundColor: accentColor, color: CREAM, fontFamily: MONO }}
    >
      {/* Halftone corner */}
      <div
        tw="absolute"
        style={{
          backgroundImage: `radial-gradient(${INK} 30%, transparent 32%)`,
          backgroundSize: "18px 18px",
          bottom: -60,
          [end]: -60,
          height: 460,
          opacity: 0.22,
          width: 560,
        }}
      />

      {/* Nav */}
      <div
        tw="flex items-center justify-between px-12 py-6"
        style={{ borderBottom: `3px solid ${CREAM}` }}
      >
        {/* Pinned LTR so bidi doesn't move the ® to the front in Arabic. */}
        <span dir="ltr" style={{ fontFamily: DISPLAY, fontSize: 38 }}>
          {brand}
        </span>
        <div tw="flex items-center text-xl" style={{ gap: 32 }}>
          {links.map((link) => (
            <span key={link}>{link}</span>
          ))}
          <div
            tw="flex items-center px-6 py-3 rounded-full text-xl"
            style={{
              backgroundColor: CREAM,
              color: INK,
              fontWeight: 700,
              gap: 12,
            }}
          >
            <span>{cta}</span>
            <Arrow color={INK} flip={isRtl} />
          </div>
        </div>
      </div>

      {/* Hero */}
      <div tw="flex flex-1 px-12 py-8 relative" style={{ minHeight: 0 }}>
        <div tw="flex flex-col justify-center flex-1">
          {words.map((word, index) => (
            <span
              key={`${word}-${index}`}
              style={{
                WebkitTextStroke: `3px ${INK}`,
                color: index % 2 === 1 ? PINK : CREAM,
                fontFamily: DISPLAY,
                fontSize: isRtl ? 112 : 132,
                letterSpacing: isRtl ? 0 : "-0.03em",
                lineHeight: isRtl ? 1.02 : 0.95,
                [marginStart]: index * 36,
                textShadow: `7px 7px 0 ${INK}`,
                textTransform: "uppercase",
              }}
            >
              {word}
            </span>
          ))}
          <div
            tw="flex text-2xl mt-7"
            style={{ lineHeight: 1.4, maxWidth: 600 }}
          >
            {subheadline}
          </div>
        </div>

        {/* Collage */}
        <div tw="flex w-[36%] relative">
          {categories.slice(0, CARD_STYLES.length).map((category, index) => {
            const style = CARD_STYLES[index] ?? CARD_STYLES[0];
            return (
              <div
                key={category}
                tw="flex flex-col justify-between absolute rounded-3xl p-6"
                style={{
                  backgroundColor: style.color,
                  border: `3px solid ${INK}`,
                  boxShadow: `9px 9px 0 ${INK}`,
                  color: INK,
                  height: "38%",
                  [start]: index % 2 === 0 ? 10 : 90,
                  top: `${2 + index * 30}%`,
                  transform: `rotate(${isRtl ? -style.tilt : style.tilt}deg)`,
                  width: 270,
                }}
              >
                <div tw="flex items-start justify-between" style={{ gap: 12 }}>
                  <span
                    style={{
                      fontFamily: DISPLAY,
                      fontSize: 44,
                      lineHeight: 1.1,
                    }}
                  >
                    {category}
                  </span>
                  <span tw="text-lg">{`0${index + 1}`}</span>
                </div>
                <div tw="flex justify-end">
                  <CardArt art={style.art} />
                </div>
              </div>
            );
          })}
        </div>
        <div
          tw="flex absolute items-center justify-center"
          style={{
            height: 170,
            [start]: "50%",
            top: 18,
            transform: `rotate(${isRtl ? -12 : 12}deg)`,
            width: 170,
          }}
        >
          <svg
            width="170"
            height="170"
            viewBox="0 0 100 100"
            style={{ left: 0, position: "absolute", top: 0 }}
          >
            <polygon
              points={starburst(16, 49, 39)}
              fill={LIME}
              stroke={INK}
              strokeWidth="2.5"
            />
          </svg>
          {/* Absolute so it paints above the (absolute) starburst. */}
          <div tw="flex absolute inset-0 items-center justify-center">
            <span
              tw="text-center"
              style={{
                color: INK,
                fontFamily: DISPLAY,
                fontSize: 28,
                lineHeight: 1.05,
                maxWidth: 110,
              }}
            >
              {badge}
            </span>
          </div>
        </div>
      </div>

      {/* Stats strip */}
      <div
        tw="flex items-center px-12 py-5"
        style={{ backgroundColor: INK, gap: 48 }}
      >
        {stats.map((stat) => {
          const [value = "", ...label] = stat.split(" ");
          return (
            <div key={stat} tw="flex items-end" style={{ gap: 12 }}>
              <span
                style={{ fontFamily: DISPLAY, fontSize: 40, lineHeight: 1.1 }}
              >
                {value}
              </span>
              <span tw="text-lg mb-1" style={{ opacity: 0.7 }}>
                {label.join(" ")}
              </span>
            </div>
          );
        })}
        <div
          tw="flex items-center text-lg"
          style={{
            color: LIME,
            gap: 8,
            [marginStart]: "auto",
          }}
        >
          <Sparkle color={LIME} />
          <span>{note.toUpperCase()}</span>
        </div>
      </div>
    </div>
  );
};

export default LaunchHero;
