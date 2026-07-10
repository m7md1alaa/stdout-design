import { z } from "zod";

export const templateId = "features-showcase" as const;

export const propsSchema = z.object({
  background: z.string().default("#0a0a0a").describe("Background color"),
  description: z.string().default("").describe("Supporting description text"),
  headline: z
    .string()
    .min(1)
    .default("Headline")
    .describe("Main headline for the feature card"),
  image: z
    .string()
    .url()
    .default("https://placehold.co/600x400")
    .describe("URL to the feature image"),
  step: z.number().min(1).default(1).describe("Feature step or index number"),
  tags: z.array(z.string()).default([]).describe("Feature tags or badges"),
  theme: z
    .enum(["dark", "light", "glass"])
    .default("dark")
    .describe("Visual theme variant"),
});

export type Props = z.infer<typeof propsSchema>;

export default function FeaturesShowcase({
  background,
  description,
  headline,
  image,
  step,
  tags,
  theme,
}: Props) {
  const isLight = theme === "light";
  const isGlass = theme === "glass";

  let bg: string;
  let textMain: string;
  let textMuted: string;
  let tagBg: string;
  let tagText: string;
  let stepBg: string;
  let dividerColor: string;
  let gradientFrom: string;
  let gradientTo: string;

  if (isLight) {
    bg = "#ffffff";
    textMain = "#0f172a";
    textMuted = "#64748b";
    tagBg = "rgba(0,0,0,0.06)";
    tagText = "#475569";
    stepBg = "#0f172a";
    dividerColor = "rgba(0,0,0,0.08)";
    gradientFrom = "rgba(255,255,255,0)";
    gradientTo = "#ffffff";
  } else if (isGlass) {
    bg = background;
    textMain = "#ffffff";
    textMuted = "rgba(255,255,255,0.6)";
    tagBg = "rgba(255,255,255,0.15)";
    tagText = "rgba(255,255,255,0.85)";
    stepBg = "rgba(255,255,255,0.12)";
    dividerColor = "rgba(255,255,255,0.08)";
    gradientFrom = "rgba(0,0,0,0)";
    gradientTo = `${background}E6`;
  } else {
    bg = background;
    textMain = "#ffffff";
    textMuted = "rgba(255,255,255,0.6)";
    tagBg = "rgba(255,255,255,0.1)";
    tagText = "rgba(255,255,255,0.85)";
    stepBg = "rgba(255,255,255,0.12)";
    dividerColor = "rgba(255,255,255,0.08)";
    gradientFrom = "rgba(0,0,0,0)";
    gradientTo = background;
  }

  return (
    <div
      tw="flex w-full h-full overflow-hidden"
      style={{
        backgroundColor: bg,
        color: textMain,
        fontFamily: "Inter, system-ui, sans-serif",
      }}
    >
      {/* Left content panel */}
      <div tw="flex flex-col justify-between flex-1 p-10 pr-0 relative z-10">
        {/* Header: step badge */}
        <div tw="flex items-center gap-3 mb-6">
          <div
            tw="flex items-center justify-center w-10 h-10 rounded-xl text-sm font-bold"
            style={{ backgroundColor: stepBg, color: textMuted }}
          >
            {String(step).padStart(2, "0")}
          </div>
          {tags.length > 0 ? (
            <div tw="w-px h-6" style={{ backgroundColor: dividerColor }} />
          ) : null}
          {tags.length > 0 ? (
            <div tw="flex flex-wrap gap-2">
              {tags.map((tag) => (
                <span
                  key={tag}
                  tw="text-xs font-medium rounded-full px-3 py-1"
                  style={{
                    backgroundColor: tagBg,
                    color: tagText,
                  }}
                >
                  {tag}
                </span>
              ))}
            </div>
          ) : null}
        </div>

        {/* Main content */}
        <div tw="flex flex-col flex-1 justify-center max-w-lg pr-10">
          <h2
            tw="text-4xl font-bold leading-tight mb-4"
            style={{ color: textMain }}
          >
            {headline}
          </h2>
          {description ? (
            <>
              <div
                tw="w-12 h-1 rounded-full mb-5"
                style={{ backgroundColor: "rgba(255,255,255,0.2)" }}
              />
              <p tw="text-lg leading-relaxed m-0" style={{ color: textMuted }}>
                {description}
              </p>
            </>
          ) : null}
        </div>

        {/* Bottom indicator */}
        <div tw="flex items-center gap-2">
          <div
            tw="w-8 h-1 rounded-full"
            style={{ backgroundColor: "rgba(255,255,255,0.35)" }}
          />
          <div
            tw="w-2 h-2 rounded-full"
            style={{ backgroundColor: "rgba(255,255,255,0.15)" }}
          />
        </div>
      </div>

      {/* Right image panel */}
      <div tw="relative w-[45%] h-full flex-shrink-0">
        {/* Gradient overlay for text readability */}
        <div
          tw="absolute inset-0 z-10"
          style={{
            background: `linear-gradient(to left, ${gradientFrom} 0%, ${gradientTo} 60%)`,
          }}
        />
        <img src={image} tw="w-full h-full object-cover" alt="" />
        {/* Accent border on left edge */}
        <div
          tw="absolute left-0 top-0 bottom-0 w-0.5 z-20"
          style={{ backgroundColor: "rgba(255,255,255,0.15)" }}
        />
      </div>
    </div>
  );
}
