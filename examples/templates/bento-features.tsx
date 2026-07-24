import { defineSchema } from "@stdout-design/core/schema";
import { z } from "zod";

export const templateId = "bento-features" as const;

export const propsSchema = defineSchema(
  z.object({
    accentColor: z
      .string()
      .default("#10b981")
      .describe(
        "The primary accent color used for all borders, icons, and highlights"
      ),
    bgColor: z
      .string()
      .default("#022c22")
      .describe("The global background color of the canvas"),
    feature_one_subtitle: z
      .string()
      .default("Uninterrupted focus sessions.")
      .describe("Subtitle for the main feature box (feature one)"),
    feature_one_title: z
      .string()
      .default("Deep Work")
      .describe("Headline for the main feature box (feature one)"),
    feature_three_subtitle: z
      .string()
      .default("7-day perfect streak.")
      .describe("Subtitle for the bottom right feature box (feature three)"),
    feature_three_title: z
      .string()
      .default("Consistency")
      .describe("Headline for the bottom right feature box (feature three)"),
    feature_two_subtitle: z
      .string()
      .default(
        "Automatically block distracting apps when a focus session begins."
      )
      .describe("Subtitle for the top right feature box (feature two)"),
    feature_two_title: z
      .string()
      .default("App Shield")
      .describe("Headline for the top right feature box (feature two)"),
    heroIcon: z
      .string()
      .default("⚡")
      .describe("Icon emoji for the main feature box"),
    streakCount: z
      .number()
      .default(7)
      .describe("Number of streak indicator dots to display"),
  })
);

export type Props = z.infer<typeof propsSchema>;

export default function BentoFeatures({
  accentColor,
  bgColor,
  heroIcon,
  feature_one_title,
  feature_one_subtitle,
  feature_two_title,
  feature_two_subtitle,
  feature_three_title,
  feature_three_subtitle,
  streakCount,
}: Props) {
  return (
    <div
      tw="flex w-full h-full p-16"
      style={{
        backgroundColor: bgColor,
        fontFamily: "IBM Plex Sans Arabic, system-ui, sans-serif",
      }}
    >
      {/* Outer Bento Grid Container (Flex based for compatibility) */}
      <div tw="flex flex-row w-full h-full gap-8">
        {/* LEFT COLUMN: Main Feature (Hero Box) */}
        <div
          tw="flex flex-col flex-1 h-full rounded-[32px] p-10 border-2"
          style={{
            backgroundColor: `${bgColor}80`,
            borderColor: accentColor,
          }}
        >
          <div tw="flex flex-col h-full justify-between">
            <div tw="flex flex-col">
              <div
                tw="flex items-center justify-center w-16 h-16 rounded-full mb-6"
                style={{ backgroundColor: accentColor }}
              >
                <span tw="text-3xl text-white">{heroIcon}</span>
              </div>
              <h2 tw="text-4xl font-bold text-white tracking-tight mb-2">
                {feature_one_title}
              </h2>
              <p tw="text-xl text-white/70">{feature_one_subtitle}</p>
            </div>

            {/* Minimalist Visual Representation of a Timer/Graph */}
            <div tw="flex items-end justify-between h-48 w-full gap-4 mt-8">
              <div
                tw="w-full h-1/4 rounded-t-lg"
                style={{ backgroundColor: accentColor, opacity: 0.3 }}
              />
              <div
                tw="w-full h-2/4 rounded-t-lg"
                style={{ backgroundColor: accentColor, opacity: 0.5 }}
              />
              <div
                tw="w-full h-full rounded-t-lg"
                style={{ backgroundColor: accentColor }}
              />
              <div
                tw="w-full h-3/4 rounded-t-lg"
                style={{ backgroundColor: accentColor, opacity: 0.8 }}
              />
            </div>
          </div>
        </div>

        {/* RIGHT COLUMN: Stack of two smaller features */}
        <div tw="flex flex-col flex-1 h-full gap-8">
          {/* Top Right Box */}
          <div
            tw="flex flex-col flex-1 rounded-[32px] p-10 border-2"
            style={{
              backgroundColor: `${bgColor}80`,
              borderColor: accentColor,
            }}
          >
            <div tw="flex items-center justify-between w-full mb-6">
              <h3 tw="text-3xl font-bold text-white tracking-tight">
                {feature_two_title}
              </h3>
              {/* Minimalist Toggle Switch */}
              <div
                tw="flex items-center w-16 h-8 rounded-full p-1"
                style={{ backgroundColor: accentColor }}
              >
                <div tw="w-6 h-6 rounded-full bg-white ml-auto" />
              </div>
            </div>
            <p tw="text-lg text-white/70 leading-relaxed">
              {feature_two_subtitle}
            </p>
          </div>

          {/* Bottom Right Box */}
          <div
            tw="flex flex-col flex-1 rounded-[32px] p-10 border-2"
            style={{
              backgroundColor: `${bgColor}80`,
              borderColor: accentColor,
            }}
          >
            <h3 tw="text-3xl font-bold text-white tracking-tight mb-2">
              {feature_three_title}
            </h3>
            <p tw="text-lg text-white/70 mb-8">{feature_three_subtitle}</p>

            {/* Minimalist Activity Dots */}
            <div tw="flex items-center justify-between w-full mt-auto">
              {Array.from({ length: streakCount }, (_, i) => i + 1).map(
                (day) => (
                  <div
                    key={day}
                    tw="w-6 h-6 rounded-full"
                    style={{
                      backgroundColor: accentColor,
                      opacity: day === streakCount ? 1 : 0.4,
                    }}
                  />
                )
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
