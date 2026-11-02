import { defineTemplate, field, keyed } from "@stdout-design/cli/template";
import type { ReactNode } from "react";

const CREAM = "#f4ede1";
const INK = "#1f1b16";
const BUTTER = "#ffd166";
const SAGE = "#9fd8b3";
const GAP = 20;
const WEEKS = [
  [40, 22, 18],
  [52, 30, 12],
  [34, 26, 20],
  [60, 18, 16],
  [46, 34, 10],
];
const AVATARS = [
  { bg: SAGE, initials: "AK" },
  { bg: BUTTER, initials: "MJ" },
  { bg: "#ffb4a2", initials: "RS" },
];
const GAUGE_RADIUS = 40;
const GAUGE_LENGTH = Math.PI * GAUGE_RADIUS;

const Tile = ({
  children,
  color = CREAM,
  grow,
}: {
  children: ReactNode;
  color?: string;
  grow: number;
}) => (
  <div
    tw="flex flex-col p-7 rounded-[32px] relative overflow-hidden"
    style={{
      backgroundColor: color,
      flexBasis: 0,
      flexGrow: grow,
      minHeight: 0,
    }}
  >
    {children}
  </div>
);

const Column = ({ children }: { children: ReactNode }) => (
  <div tw="flex flex-col flex-1" style={{ flexBasis: 0, gap: GAP }}>
    {children}
  </div>
);

/** A cheerful coin mascot — drawn, so it needs no image fetch. */
const Coin = ({ color }: { color: string }) => (
  <svg width="150" height="150" viewBox="0 0 100 100">
    <ellipse cx="54" cy="54" rx="42" ry="42" fill={INK} />
    <circle cx="50" cy="50" r="42" fill={BUTTER} stroke={INK} strokeWidth="4" />
    <circle
      cx="50"
      cy="50"
      r="31"
      fill="none"
      stroke={INK}
      strokeWidth="3"
      strokeDasharray="4 5"
    />
    <circle cx="39" cy="44" r="5" fill={INK} />
    <circle cx="61" cy="44" r="5" fill={INK} />
    <path
      d="M36 58 Q50 72 64 58"
      fill="none"
      stroke={INK}
      strokeWidth="5"
      strokeLinecap="round"
    />
    <circle cx="31" cy="58" r="5" fill={color} opacity="0.7" />
    <circle cx="69" cy="58" r="5" fill={color} opacity="0.7" />
  </svg>
);

// oxlint-disable-next-line sort-keys -- schema reads before the render that uses it
export default defineTemplate({
  // Latin face first; Arabic glyphs fall through to the Arabic face.
  fonts: {
    mono: {
      faces: [
        { family: "Space Mono", weights: [400, 700] },
        { family: "IBM Plex Sans Arabic", weights: [400, 700] },
      ],
      generic: "monospace",
    },
    sans: {
      faces: [
        { family: "Bricolage Grotesque", weights: [400, 700] },
        { family: "IBM Plex Sans Arabic", weights: [400, 700] },
      ],
    },
  },
  schema: {
    accentColor: field.color("#ff5a36", {
      description: "Accent for the solid tiles, chart, and gauge",
    }),
    background: field.color("#191714", {
      description: "Background behind the tiles",
    }),
    brand: field.text("tally", {
      description: "Wordmark in the logo tile",
      translatable: false,
    }),
    chartLabel: field.text("Spending by week", {
      description: "Caption of the bar chart tile",
    }),
    description: field.text(
      "Every card, every bill, sorted the second it lands.",
      { description: "Supporting description text", multiline: true }
    ),
    gaugeLabel: field.text("Budget used", {
      description: "Caption of the gauge tile",
    }),
    gaugePercent: field.number(72, {
      description: "How full the gauge is, 0 to 100",
      max: 100,
      min: 0,
    }),
    headline: field.text("Know where every dollar goes", {
      description: "Main headline for the feature card",
      min: 1,
    }),
    metricDelta: field.text("+18%", {
      description: "Change shown next to the metric",
    }),
    metricLabel: field.text("Saved this month", {
      description: "Caption of the big metric",
    }),
    metricValue: field.text("$1,240", { description: "The big metric" }),
    rating: field.text("4.9", {
      description: "Rating in the reviews tile",
      translatable: false,
    }),
    ratingLabel: field.text("App Store rating", {
      description: "Caption of the rating",
    }),
    receipt: field.list(
      field.object({
        amount: field.text("0.00", { translatable: false }),
        item: field.text("Item"),
      }),
      {
        default: [
          { amount: "4.50", item: "Coffee" },
          { amount: "62.10", item: "Groceries" },
          { amount: "2.75", item: "Metro" },
        ],
        description: "Receipt lines",
        max: 4,
        min: 1,
      }
    ),
    receiptNote: field.text("Sorted automatically", {
      description: "Pill under the receipt",
    }),
  },
  inspector: [
    ["Headline", ["headline", "description", "brand"]],
    ["Metric", ["metricLabel", "metricValue", "metricDelta"]],
    ["Chart and gauge", ["chartLabel", "gaugeLabel", "gaugePercent"]],
    ["Rating", ["rating", "ratingLabel"]],
    ["Receipt", ["receipt", "receiptNote"]],
    ["Colors", ["accentColor", "background"]],
  ],
  render: (props, ctx) => (
    <div
      tw="flex w-full h-full p-10"
      style={{
        backgroundColor: props.background,
        color: INK,
        fontFamily: ctx.fonts.sans,
        gap: GAP,
      }}
    >
      <Column>
        <Tile color={props.accentColor} grow={0.75}>
          <div tw="flex flex-1 items-center" style={{ gap: 10 }}>
            {/* A wordmark keeps its Latin letter spacing in every locale. */}
            <span
              dir="ltr"
              style={{
                color: CREAM,
                fontSize: 88,
                fontWeight: 700,
                letterSpacing: "-0.05em",
                lineHeight: 1,
              }}
            >
              {props.brand}
            </span>
            <div tw="flex" style={{ gap: 6 }}>
              <div
                tw="w-5 h-5 rounded-full"
                style={{ backgroundColor: BUTTER }}
              />
              <div
                tw="w-5 h-5 rounded-full"
                style={{ backgroundColor: CREAM }}
              />
            </div>
          </div>
        </Tile>
        <Tile grow={1}>
          <span tw="text-2xl">{props.metricLabel}</span>
          <div tw="flex items-end mt-auto" style={{ gap: 12 }}>
            <span
              style={{
                ...ctx.type({
                  leading: 1,
                  size: 76,
                  tracking: -0.04,
                  weight: 700,
                }),
                whiteSpace: "nowrap",
              }}
            >
              {props.metricValue}
            </span>
            <span
              dir="ltr"
              tw="px-3 py-1 rounded-full text-xl mb-2"
              style={{ backgroundColor: SAGE, fontWeight: 700 }}
            >
              {props.metricDelta}
            </span>
          </div>
        </Tile>
        <Tile color={BUTTER} grow={1.2}>
          <span tw="text-xl">{props.chartLabel}</span>
          <div
            tw="flex flex-1 items-end mt-4"
            style={{ gap: 12, minHeight: 0 }}
          >
            {keyed(WEEKS, (week) => week.join("-")).map(
              ({ key, value: week }) => (
                <div
                  key={key}
                  tw="flex flex-col flex-1 justify-end"
                  style={{ height: "100%" }}
                >
                  {week.map((share, part) => (
                    <div
                      key={`part-${part}`}
                      tw="flex w-full"
                      style={{
                        backgroundColor: [INK, props.accentColor, CREAM][part],
                        borderRadius: part === 0 ? "10px 10px 0 0" : 0,
                        height: `${share}%`,
                      }}
                    />
                  ))}
                </div>
              )
            )}
          </div>
        </Tile>
      </Column>

      <Column>
        <Tile grow={0.85}>
          <div tw="flex items-end" style={{ gap: 10 }}>
            <span style={{ fontSize: 72, fontWeight: 700, lineHeight: 1 }}>
              {props.rating}
            </span>
            <svg
              width="40"
              height="40"
              viewBox="0 0 24 24"
              style={{ marginBottom: 8 }}
            >
              <path
                d="M12 1 15.1 8.3 23 9 17 14.2 18.8 22 12 17.9 5.2 22 7 14.2 1 9 8.9 8.3Z"
                fill={props.accentColor}
              />
            </svg>
          </div>
          <span tw="text-lg mt-1" style={{ color: "#6f675b" }}>
            {props.ratingLabel}
          </span>
          <div tw="flex mt-auto">
            {AVATARS.map((avatar, index) => (
              <div
                key={avatar.initials}
                tw="flex items-center justify-center w-16 h-16 rounded-full text-xl"
                style={{
                  backgroundColor: avatar.bg,
                  border: `4px solid ${CREAM}`,
                  fontWeight: 700,
                  marginInlineStart: index === 0 ? 0 : -16,
                }}
              >
                {avatar.initials}
              </div>
            ))}
          </div>
        </Tile>
        <Tile grow={2}>
          <span
            style={ctx.type({
              leading: 1.05,
              size: 50,
              tracking: -0.03,
              weight: 700,
            })}
          >
            {props.headline}
          </span>
          <span tw="text-xl mt-4" style={{ color: "#6f675b", lineHeight: 1.4 }}>
            {props.description}
          </span>
          <div
            tw="flex flex-1 items-end justify-center"
            style={{ minHeight: 0 }}
          >
            <Coin color={props.accentColor} />
          </div>
        </Tile>
      </Column>

      <Column>
        <Tile color={SAGE} grow={1.25}>
          <div
            tw="flex flex-col px-6 pt-6 pb-8"
            style={{
              backgroundColor: "#fffdf8",
              boxShadow: "0 14px 30px rgba(31,27,22,0.18)",
              fontFamily: ctx.fonts.mono,
              gap: 10,
              transform: `rotate(${ctx.flip(-3)}deg)`,
            }}
          >
            <span
              tw="text-sm"
              style={ctx.type({ tracking: 0.2, uppercase: true })}
            >
              {props.brand}
            </span>
            {keyed(props.receipt, (line) => line.item).map(({ key, value }) => (
              <div
                key={key}
                tw="flex justify-between text-lg"
                style={{ gap: 12 }}
              >
                <span>{value.item}</span>
                <span style={{ fontWeight: 700 }}>{value.amount}</span>
              </div>
            ))}
            <div
              tw="flex"
              style={{ borderTop: `2px dashed ${INK}`, marginTop: 4 }}
            />
          </div>
          <div
            tw="flex self-start items-center px-4 py-2 rounded-full text-lg mt-auto"
            style={{ backgroundColor: INK, color: CREAM, gap: 8 }}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
              <path
                d="M4 12.5 9.5 18 20 6"
                stroke={SAGE}
                strokeWidth="3.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
            <span>{props.receiptNote}</span>
          </div>
        </Tile>
        <Tile color={INK} grow={1}>
          <span tw="text-xl" style={{ color: CREAM }}>
            {props.gaugeLabel}
          </span>
          <div
            tw="flex flex-1 items-end justify-center"
            style={{ minHeight: 0 }}
          >
            <div tw="flex relative" style={{ height: 110, width: 220 }}>
              <svg
                width="220"
                height="110"
                viewBox="0 0 100 50"
                style={{ left: 0, position: "absolute", top: 0 }}
              >
                <path
                  d="M10 50 A40 40 0 0 1 90 50"
                  fill="none"
                  stroke="#3a342c"
                  strokeWidth="14"
                  strokeLinecap="round"
                />
                <path
                  d="M10 50 A40 40 0 0 1 90 50"
                  fill="none"
                  stroke={props.accentColor}
                  strokeWidth="14"
                  strokeLinecap="round"
                  strokeDasharray={`${(GAUGE_LENGTH * props.gaugePercent) / 100} ${GAUGE_LENGTH}`}
                  // The gauge fills from the start side.
                  transform={
                    ctx.dir === "rtl"
                      ? "translate(100 0) scale(-1 1)"
                      : undefined
                  }
                />
              </svg>
              <div tw="flex absolute inset-0 items-end justify-center">
                <span
                  style={{
                    color: CREAM,
                    fontSize: 44,
                    fontWeight: 700,
                    lineHeight: 1,
                  }}
                >
                  {`${props.gaugePercent}%`}
                </span>
              </div>
            </div>
          </div>
        </Tile>
      </Column>
    </div>
  ),
});
