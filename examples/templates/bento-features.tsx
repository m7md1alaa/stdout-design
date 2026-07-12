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
    locale: z
      .string()
      .optional()
      .describe("Current locale code for RTL support"),
  })
);

export type Props = z.infer<typeof propsSchema>;

export default function BentoFeatures({ accentColor, bgColor, locale }: Props) {
  const isRtl = locale?.startsWith("ar") ?? false;
  return (
    <div
      lang={isRtl ? "ar" : undefined}
      dir={isRtl ? "rtl" : "ltr"}
      tw="flex w-full h-full p-16"
      style={{
        backgroundColor: bgColor,
        fontFamily: "sans-serif",
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
                <span tw="text-3xl text-white">⚡</span>
              </div>
              <h2 tw="text-4xl font-bold text-white tracking-tight mb-2">
                Deep Work
              </h2>
              <p tw="text-xl text-white/70">Uninterrupted focus sessions.</p>
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
                App Shield
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
              Automatically block distracting apps when a focus session begins.
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
              Consistency
            </h3>
            <p tw="text-lg text-white/70 mb-8">7-day perfect streak.</p>

            {/* Minimalist Activity Dots */}
            <div tw="flex items-center justify-between w-full mt-auto">
              {[1, 2, 3, 4, 5, 6, 7].map((day) => (
                <div
                  key={day}
                  tw="w-6 h-6 rounded-full"
                  style={{
                    backgroundColor: accentColor,
                    opacity: day === 7 ? 1 : 0.4,
                  }}
                />
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
