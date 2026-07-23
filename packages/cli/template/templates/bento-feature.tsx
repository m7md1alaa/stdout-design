import { defineSchema } from "@stdout-design/cli/schema";
import { z } from "zod";

export const templateId = "bento-feature" as const;

export const propsSchema = defineSchema(
  z.object({
    accentColor: z
      .string()
      .default("#6366f1")
      .describe("The primary accent color used for borders and highlights"),
    background: z
      .string()
      .default("#0a0a0b")
      .describe("Background color of the card"),
    description: z
      .string()
      .default("A beautiful description goes here.")
      .describe("Supporting description text"),
    headline: z
      .string()
      .min(1)
      .default("Featured App")
      .describe("Main headline for the feature card"),
    locale: z
      .string()
      .optional()
      .describe("Current locale code for RTL support"),
  })
);

export type Props = z.infer<typeof propsSchema>;

export default function BentoFeature({
  headline,
  description,
  accentColor,
  background,
  locale,
}: Props) {
  const isRtl = locale?.startsWith("ar") ?? false;

  return (
    <div
      lang={isRtl ? "ar" : undefined}
      dir={isRtl ? "rtl" : "ltr"}
      tw="flex w-full h-full p-8"
      style={{
        backgroundColor: background,
        color: "#ffffff",
        fontFamily: "system-ui, sans-serif",
      }}
    >
      <div
        tw="flex flex-col justify-center items-center w-full h-full rounded-[32px] border-2 p-12"
        style={{ backgroundColor: `${background}80`, borderColor: accentColor }}
      >
        <div
          tw="flex items-center justify-center w-16 h-16 rounded-full mb-6"
          style={{ backgroundColor: accentColor }}
        >
          <span tw="text-3xl text-white">✦</span>
        </div>
        <h2
          tw="text-4xl font-bold tracking-tight text-center mb-2"
          style={{ color: "#ffffff" }}
        >
          {headline}
        </h2>
        {description ? (
          <p tw="text-xl text-center max-w-md" style={{ color: "#a1a1aa" }}>
            {description}
          </p>
        ) : null}
      </div>
    </div>
  );
}
