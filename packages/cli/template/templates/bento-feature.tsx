import { defineSchema } from "@stdout-design/cli/schema";
import { z } from "zod";

export const templateId = "bento-feature" as const;

export const propsSchema = defineSchema(
  z.object({
    accentColor: z
      .string()
      .default("#ff5a36")
      .describe("The primary accent color used for the solid tiles"),
    background: z
      .string()
      .default("#191714")
      .describe("Background color behind the tiles"),
    brand: z.string().default("tally").describe("Wordmark in the logo tile"),
    chartLabel: z
      .string()
      .default("Spending by week")
      .describe("Caption of the bar chart tile"),
    description: z
      .string()
      .default("Every card, every bill, sorted the second it lands.")
      .describe("Supporting description text"),
    gaugeLabel: z
      .string()
      .default("Budget used")
      .describe("Caption of the gauge tile"),
    gaugePercent: z
      .number()
      .min(0)
      .max(100)
      .default(72)
      .describe("How full the gauge is, 0–100"),
    headline: z
      .string()
      .min(1)
      .default("Know where every dollar goes")
      .describe("Main headline for the feature card"),
    locale: z
      .string()
      .optional()
      .describe("Current locale code for RTL support"),
    metricDelta: z
      .string()
      .default("+18%")
      .describe("Change shown next to the metric"),
    metricLabel: z
      .string()
      .default("Saved this month")
      .describe("Caption of the big metric"),
    metricValue: z.string().default("$1,240").describe("The big metric"),
    rating: z.string().default("4.9").describe("Rating in the reviews tile"),
    ratingLabel: z
      .string()
      .default("App Store rating")
      .describe("Caption of the rating"),
    receipt: z
      .array(z.string())
      .default(["Coffee 4.50", "Groceries 62.10", "Metro 2.75"])
      .describe("Receipt lines — the last word is the amount"),
    receiptNote: z
      .string()
      .default("Sorted automatically")
      .describe("Pill under the receipt"),
  })
);

export type Props = z.infer<typeof propsSchema>;

const CREAM = "#f4ede1";
const INK = "#1f1b16";
const BUTTER = "#ffd166";
const SAGE = "#9fd8b3";
// Latin face first; Arabic glyphs fall through to the Arabic face.
const FONT = "Bricolage Grotesque, IBM Plex Sans Arabic, sans-serif";
const MONO = "Space Mono, IBM Plex Sans Arabic, monospace";
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
  children: React.ReactNode;
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

const Column = ({ children }: { children: React.ReactNode }) => (
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

const BentoFeature = ({
  accentColor,
  background,
  brand,
  chartLabel,
  description,
  gaugeLabel,
  gaugePercent,
  headline,
  locale,
  metricDelta,
  metricLabel,
  metricValue,
  rating,
  ratingLabel,
  receipt,
  receiptNote,
}: Props) => {
  const isRtl = locale?.startsWith("ar") ?? false;
  const tracking = (em: number) => (isRtl ? 0 : `${em}em`);

  return (
    <div
      lang={isRtl ? "ar" : undefined}
      dir={isRtl ? "rtl" : "ltr"}
      tw="flex w-full h-full p-10"
      style={{
        backgroundColor: background,
        color: INK,
        fontFamily: FONT,
        gap: GAP,
      }}
    >
      <Column>
        <Tile color={accentColor} grow={0.75}>
          <div tw="flex flex-1 items-center" style={{ gap: 10 }}>
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
              {brand}
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
          <span tw="text-2xl">{metricLabel}</span>
          <div tw="flex items-end mt-auto" style={{ gap: 12 }}>
            <span
              style={{
                fontSize: 76,
                fontWeight: 700,
                letterSpacing: tracking(-0.04),
                lineHeight: 1,
                whiteSpace: "nowrap",
              }}
            >
              {metricValue}
            </span>
            <span
              dir="ltr"
              tw="px-3 py-1 rounded-full text-xl mb-2"
              style={{ backgroundColor: SAGE, fontWeight: 700 }}
            >
              {metricDelta}
            </span>
          </div>
        </Tile>
        <Tile color={BUTTER} grow={1.2}>
          <span tw="text-xl">{chartLabel}</span>
          <div
            tw="flex flex-1 items-end mt-4"
            style={{ gap: 12, minHeight: 0 }}
          >
            {WEEKS.map((week, index) => (
              <div
                key={`week-${index}`}
                tw="flex flex-col flex-1 justify-end"
                style={{ height: "100%" }}
              >
                {week.map((share, part) => (
                  <div
                    key={`part-${part}`}
                    tw="flex w-full"
                    style={{
                      backgroundColor: [INK, accentColor, CREAM][part],
                      borderRadius: part === 0 ? "10px 10px 0 0" : 0,
                      height: `${share}%`,
                    }}
                  />
                ))}
              </div>
            ))}
          </div>
        </Tile>
      </Column>

      <Column>
        <Tile grow={0.85}>
          <div tw="flex items-end" style={{ gap: 10 }}>
            <span style={{ fontSize: 72, fontWeight: 700, lineHeight: 1 }}>
              {rating}
            </span>
            <svg
              width="40"
              height="40"
              viewBox="0 0 24 24"
              style={{ marginBottom: 8 }}
            >
              <path
                d="M12 1 15.1 8.3 23 9 17 14.2 18.8 22 12 17.9 5.2 22 7 14.2 1 9 8.9 8.3Z"
                fill={accentColor}
              />
            </svg>
          </div>
          <span tw="text-lg mt-1" style={{ color: "#6f675b" }}>
            {ratingLabel}
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
                  [isRtl ? "marginRight" : "marginLeft"]: index === 0 ? 0 : -16,
                }}
              >
                {avatar.initials}
              </div>
            ))}
          </div>
        </Tile>
        <Tile grow={2}>
          <span
            style={{
              fontSize: 50,
              fontWeight: 700,
              letterSpacing: tracking(-0.03),
              lineHeight: isRtl ? 1.3 : 1.05,
            }}
          >
            {headline}
          </span>
          <span tw="text-xl mt-4" style={{ color: "#6f675b", lineHeight: 1.4 }}>
            {description}
          </span>
          <div
            tw="flex flex-1 items-end justify-center"
            style={{ minHeight: 0 }}
          >
            <Coin color={accentColor} />
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
              fontFamily: MONO,
              gap: 10,
              transform: `rotate(${isRtl ? 3 : -3}deg)`,
            }}
          >
            <span tw="text-sm" style={{ letterSpacing: isRtl ? 0 : "0.2em" }}>
              {brand.toUpperCase()}
            </span>
            {receipt.map((line) => {
              const words = line.split(" ");
              const amount = words.pop() ?? "";
              return (
                <div
                  key={line}
                  tw="flex justify-between text-lg"
                  style={{ gap: 12 }}
                >
                  <span>{words.join(" ")}</span>
                  <span style={{ fontWeight: 700 }}>{amount}</span>
                </div>
              );
            })}
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
            <span>{receiptNote}</span>
          </div>
        </Tile>
        <Tile color={INK} grow={1}>
          <span tw="text-xl" style={{ color: CREAM }}>
            {gaugeLabel}
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
                  stroke={accentColor}
                  strokeWidth="14"
                  strokeLinecap="round"
                  strokeDasharray={`${(GAUGE_LENGTH * gaugePercent) / 100} ${GAUGE_LENGTH}`}
                  transform={isRtl ? "translate(100 0) scale(-1 1)" : undefined}
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
                  {`${gaugePercent}%`}
                </span>
              </div>
            </div>
          </div>
        </Tile>
      </Column>
    </div>
  );
};

export default BentoFeature;
