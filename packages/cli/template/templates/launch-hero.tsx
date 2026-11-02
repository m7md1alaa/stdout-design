import {
  Arrow,
  defineTemplate,
  field,
  halftone,
  keyed,
  Sparkle,
  starburst,
  words,
} from "@stdout-design/cli/template";

const INK = "#0e0e12";
const CREAM = "#fff6e5";
const PINK = "#ff4fa3";
const LIME = "#c8f560";
const CARD_STYLES = [
  { art: "bolt", color: CREAM, tilt: -5 },
  { art: "spiral", color: PINK, tilt: 4 },
  { art: "eye", color: LIME, tilt: -2 },
] as const;

type Art = (typeof CARD_STYLES)[number]["art"];

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
  },
  schema: {
    background: field.color("#2b3bff", { description: "Page background" }),
    badge: field.text("Drop 07", {
      description: "Text on the starburst sticker",
    }),
    brand: field.text("OFFBEAT®", {
      description: "Wordmark in the nav bar",
      translatable: false,
    }),
    categories: field.list(field.text("Category"), {
      default: ["Tees", "Hoodies", "Caps"],
      description: "One label per collage card",
      length: CARD_STYLES.length,
    }),
    cta: field.text("Shop now", { description: "Primary button label" }),
    headline: field.text("Wear It Loud", {
      description: "Hero headline; each word gets its own line",
      min: 1,
    }),
    links: field.list(field.text("Link"), {
      default: ["Drops", "Archive", "Club"],
      description: "Nav bar links",
      max: 4,
    }),
    note: field.text("Ships worldwide", {
      description: "Small note at the end of the stats strip",
    }),
    stats: field.list(
      field.object({
        label: field.text("label"),
        value: field.text("0", { translatable: false }),
      }),
      {
        default: [
          { label: "drops a year", value: "12" },
          { label: "restocks", value: "0" },
          { label: "cotton", value: "100%" },
        ],
        description: "Stats strip: a big value and its label",
        max: 3,
        min: 1,
      }
    ),
    subheadline: field.text(
      "Small-batch streetwear, printed in a city that never whispers.",
      { description: "Supporting line under the headline", multiline: true }
    ),
  },
  render: (props, ctx) => (
    <div
      tw="flex flex-col w-full h-full overflow-hidden relative"
      style={{
        backgroundColor: props.background,
        color: CREAM,
        fontFamily: ctx.fonts.mono,
      }}
    >
      {/* Halftone corner */}
      <div
        tw="absolute"
        style={{
          ...halftone({ color: INK, spacing: 18 }),
          bottom: -60,
          height: 460,
          insetInlineEnd: -60,
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
        <span dir="ltr" style={{ fontFamily: ctx.fonts.display, fontSize: 38 }}>
          {props.brand}
        </span>
        <div tw="flex items-center text-xl" style={{ gap: 32 }}>
          {keyed(props.links).map((link) => (
            <span key={link.key}>{link.value}</span>
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
            <span>{props.cta}</span>
            <Arrow color={INK} ctx={ctx} />
          </div>
        </div>
      </div>

      {/* Hero */}
      <div tw="flex flex-1 px-12 py-8 relative" style={{ minHeight: 0 }}>
        <div tw="flex flex-col justify-center flex-1">
          {keyed(words(props.headline)).map((word) => (
            <span
              key={word.key}
              style={{
                ...ctx.type({
                  font: "display",
                  leading: 0.95,
                  // Lalezar runs tall: the default Arabic leading would
                  // push the subheadline off a 675px canvas.
                  scripts: { arabic: { leading: 1, size: 100 } },
                  size: 132,
                  tracking: -0.03,
                  uppercase: true,
                }),
                WebkitTextStroke: `3px ${INK}`,
                color: word.index % 2 === 1 ? PINK : CREAM,
                marginInlineStart: word.index * 36,
                textShadow: `7px 7px 0 ${INK}`,
              }}
            >
              {word.value}
            </span>
          ))}
          <div
            tw="flex text-2xl mt-7"
            style={{ lineHeight: 1.4, maxWidth: 600 }}
          >
            {props.subheadline}
          </div>
        </div>

        {/* Collage */}
        <div tw="flex w-[36%] relative">
          {keyed(props.categories).map((category) => {
            const style = CARD_STYLES[category.index] ?? CARD_STYLES[0];
            return (
              <div
                key={category.key}
                tw="flex flex-col justify-between absolute rounded-3xl p-6"
                style={{
                  backgroundColor: style.color,
                  border: `3px solid ${INK}`,
                  boxShadow: `9px 9px 0 ${INK}`,
                  color: INK,
                  height: "38%",
                  insetInlineStart: category.index % 2 === 0 ? 10 : 90,
                  top: `${2 + category.index * 30}%`,
                  transform: `rotate(${ctx.flip(style.tilt)}deg)`,
                  width: 270,
                }}
              >
                <div tw="flex items-start justify-between" style={{ gap: 12 }}>
                  <span
                    style={{
                      fontFamily: ctx.fonts.display,
                      fontSize: 44,
                      lineHeight: 1.1,
                    }}
                  >
                    {category.value}
                  </span>
                  <span tw="text-lg">{`0${category.index + 1}`}</span>
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
            insetInlineStart: "50%",
            top: 18,
            transform: `rotate(${ctx.flip(12)}deg)`,
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
                fontFamily: ctx.fonts.display,
                fontSize: 28,
                lineHeight: 1.05,
                maxWidth: 110,
              }}
            >
              {props.badge}
            </span>
          </div>
        </div>
      </div>

      {/* Stats strip */}
      <div
        tw="flex items-center px-12 py-5"
        style={{ backgroundColor: INK, gap: 48 }}
      >
        {keyed(props.stats, (stat) => stat.value).map(
          ({ key, value: stat }) => (
            <div key={key} tw="flex items-end" style={{ gap: 12 }}>
              <span
                style={{
                  fontFamily: ctx.fonts.display,
                  fontSize: 40,
                  lineHeight: 1.1,
                }}
              >
                {stat.value}
              </span>
              <span tw="text-lg mb-1" style={{ opacity: 0.7 }}>
                {stat.label}
              </span>
            </div>
          )
        )}
        <div
          tw="flex items-center text-lg"
          style={{
            color: LIME,
            gap: 8,
            marginInlineStart: "auto",
            textTransform: "uppercase",
          }}
        >
          <Sparkle color={LIME} size={18} />
          <span>{props.note}</span>
        </div>
      </div>
    </div>
  ),
});
