import {
  Arrow,
  defineTemplate,
  field,
  halftone,
  keyed,
  Sparkle,
  starburst,
} from "@stdout-design/cli/template";

const INK = "#121212";
const PAPER = "#efece4";
const COBALT = "#3046ff";
const CELLS_PER_ROW = 3;
const CELL_COUNT = CELLS_PER_ROW * 2;
const SPECIMEN_SIZE = 120;

/** One small specimen per cell, picked by position so any six labels work. */
const Specimen = ({
  highlight,
  index,
  font,
}: {
  highlight: string;
  index: number;
  font: string;
}) => {
  switch (index % CELL_COUNT) {
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
              fontFamily: font,
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
            ...halftone({ color: INK, dot: 0.34, spacing: 10 }),
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

// oxlint-disable-next-line sort-keys -- schema reads before the render that uses it
export default defineTemplate({
  // Latin face first; Arabic glyphs fall through to the Arabic face.
  fonts: {
    heavy: { faces: ["Archivo Black", "Lalezar"] },
    mono: {
      faces: [
        { family: "Space Mono", weights: [400, 700] },
        { family: "IBM Plex Sans Arabic", weights: [400, 700] },
      ],
      generic: "monospace",
    },
    serif: { faces: ["Instrument Serif", "Amiri"], generic: "serif" },
    title: { faces: ["Anton", "Lalezar"] },
  },
  schema: {
    aside: field.text("to steal & remix", {
      description: "Serif aside next to the edition",
    }),
    cta: field.text("Save for later", {
      description: "Button label in the footer",
    }),
    edition: field.text("2027", {
      description: "Big outlined word under the headline",
    }),
    footer: field.text("Make the thumb stop.", {
      description: "Serif line in the footer",
    }),
    headline: field.text("Ways to stop the scroll", {
      description: "Headline, prefixed with the number of items",
      min: 1,
    }),
    highlight: field.color("#ff6a3d", {
      description: "Highlight color for the edition and button",
    }),
    issue: field.text("Issue 07", { description: "Small label top-start" }),
    items: field.list(field.text("Item"), {
      default: [
        "Loud type",
        "Halftone",
        "Clashing color",
        "Raw collage",
        "Stickers",
        "Big shapes",
      ],
      description: "One name per grid cell",
      length: CELL_COUNT,
    }),
    strap: field.text("A field guide for the feed", {
      description: "Small line top-end",
    }),
  },
  render: (props, ctx) => {
    const { fonts } = ctx;
    const cells = keyed(props.items);
    const rows = [
      cells.slice(0, CELLS_PER_ROW),
      cells.slice(CELLS_PER_ROW, CELL_COUNT),
    ];

    return (
      <div
        tw="flex flex-col w-full h-full px-12 py-10"
        style={{ backgroundColor: PAPER, color: INK, fontFamily: fonts.mono }}
      >
        <div
          tw="flex items-center justify-between text-lg mb-3"
          style={{ flexShrink: 0 }}
        >
          <div tw="flex items-center" style={{ gap: 12 }}>
            <span style={{ fontWeight: 700 }}>STDOUT</span>
            <Sparkle color={INK} />
            <span style={{ textTransform: "uppercase" }}>{props.issue}</span>
          </div>
          <span style={{ textTransform: "uppercase" }}>{props.strap}</span>
        </div>

        <div tw="flex flex-col" style={{ flexShrink: 0 }}>
          <span
            style={ctx.type({
              font: "title",
              leading: 0.9,
              size: 96,
              uppercase: true,
            })}
          >
            {`${props.items.length} ${props.headline}`}
          </span>
          <div tw="flex items-end" style={{ gap: 24 }}>
            <span
              style={{
                ...ctx.type({
                  font: "heavy",
                  leading: 1,
                  size: 104,
                  tracking: -0.04,
                }),
                WebkitTextStroke: `3px ${INK}`,
                color: props.highlight,
                textShadow: `5px 5px 0 ${INK}`,
              }}
            >
              {props.edition}
            </span>
            <span
              tw="mb-3"
              style={ctx.type({ font: "serif", italic: true, size: 42 })}
            >
              {props.aside}
            </span>
          </div>
        </div>

        <div tw="flex flex-col flex-1 mt-5" style={{ minHeight: 0 }}>
          {rows.map((row) => (
            <div
              key={row.map((cell) => cell.key).join("|")}
              tw="flex flex-1"
              style={{ borderTop: `3px solid ${INK}`, minHeight: 0 }}
            >
              {row.map((cell, column) => (
                <div
                  key={cell.key}
                  tw="flex flex-col flex-1 pt-3 relative overflow-hidden"
                  style={{
                    borderInlineStart:
                      column === 0 ? "none" : `2px solid ${INK}`,
                    paddingInlineStart: column === 0 ? 0 : 18,
                  }}
                >
                  {/* Anchored to the bottom corner: short canvases crop it
                      like a print bleed. Rendered first so the label paints
                      on top if they meet. */}
                  <div
                    tw="flex absolute"
                    style={{ bottom: 14, insetInlineEnd: 18 }}
                  >
                    <Specimen
                      font={fonts.heavy}
                      highlight={props.highlight}
                      index={cell.index}
                    />
                  </div>
                  <div tw="flex items-baseline relative" style={{ gap: 12 }}>
                    <span tw="text-2xl" style={{ fontWeight: 700 }}>
                      {String(cell.index + 1).padStart(2, "0")}
                    </span>
                    <span
                      tw="px-1"
                      style={{
                        backgroundColor: PAPER,
                        fontFamily: fonts.heavy,
                        fontSize: 20,
                        textTransform: "uppercase",
                      }}
                    >
                      {cell.value}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          ))}
        </div>

        <div
          tw="flex items-center justify-between pt-5"
          style={{ borderTop: `3px solid ${INK}`, flexShrink: 0 }}
        >
          <span style={ctx.type({ font: "serif", leading: 1.1, size: 40 })}>
            {props.footer}
          </span>
          <div
            tw="flex items-center px-6 py-3 rounded-full"
            style={{
              backgroundColor: props.highlight,
              border: `3px solid ${INK}`,
              fontFamily: fonts.heavy,
              fontSize: 20,
              gap: 12,
              textTransform: "uppercase",
            }}
          >
            <span>{props.cta}</span>
            <Arrow color={INK} ctx={ctx} />
          </div>
        </div>
      </div>
    );
  },
});
