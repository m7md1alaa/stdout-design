import { defineSchema } from "@stdout-design/core/schema";
import { z } from "zod";

export const templateId = "complex-stat-card" as const;

export const propsSchema = defineSchema(
  z.object({
    accentColor: z.string().default("#8b5cf6").describe("Primary brand color"),
    collaborators: z
      .array(z.url())
      .default([
        "https://i.pravatar.cc/150?u=1",
        "https://i.pravatar.cc/150?u=2",
        "https://i.pravatar.cc/150?u=3",
      ])
      .describe("Avatar URLs for the top right"),
    label: z.string().default("vs last 7 days"),
    showGrid: z
      .boolean()
      .default(true)
      .describe("Render background grid pattern"),
    sparkline: z
      .array(z.coerce.number())
      .default([30, 45, 25, 60, 85, 70, 95])
      .describe("Data points for the bottom bar chart"),
    stat: z.string().default("124.5K"),
    theme: z
      .enum(["light", "dark"])
      .default("dark")
      .describe("Color theme mode"),
    title: z.string().default("Weekly Active Users"),
    trend: z
      .object({
        isPositive: z.boolean().default(true),
        value: z.string().default("14.2%"),
      })
      .default({}),
  })
);

export type Props = z.infer<typeof propsSchema>;

const ComplexStatCard = ({
  theme,
  accentColor,
  title,
  stat,
  label,
  trend,
  sparkline,
  collaborators,
  showGrid,
}: Props) => {
  const isDark = theme === "dark";
  const bg = isDark ? "#0f172a" : "#ffffff";
  const textMain = isDark ? "#f8fafc" : "#0f172a";
  const textMuted = isDark ? "#94a3b8" : "#64748b";
  const gridColor = isDark ? "rgba(255,255,255,0.05)" : "rgba(0,0,0,0.05)";

  return (
    <div
      tw="flex flex-col w-full h-full relative overflow-hidden p-10 justify-between"
      style={{ backgroundColor: bg, fontFamily: "Inter, sans-serif" }}
    >
      {/* Background Grid Pattern - Tests background-image rendering and absolute positioning */}
      {showGrid && (
        <div
          tw="absolute inset-0 flex"
          style={{
            backgroundImage: `linear-gradient(to right, ${gridColor} 1px, transparent 1px), linear-gradient(to bottom, ${gridColor} 1px, transparent 1px)`,
            backgroundSize: "40px 40px",
            zIndex: 0,
          }}
        />
      )}

      {/* Header - Tests flex space-between, z-index layering, and SVGs */}
      <div tw="flex justify-between items-center w-full z-10 relative">
        <div tw="flex items-center">
          <div
            tw="w-12 h-12 rounded-xl flex items-center justify-center mr-4"
            style={{ backgroundColor: `${accentColor}20`, color: accentColor }}
          >
            <svg
              width="24"
              height="24"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M22 12h-4l-3 9L9 3l-3 9H2" />
            </svg>
          </div>
          <p
            tw="text-2xl font-medium tracking-tight m-0"
            style={{ color: textMuted }}
          >
            {title}
          </p>
        </div>

        {/* Overlapping Avatars - Tests negative margins and mapping elements */}
        <div tw="flex items-center">
          {collaborators.map((url, i) => (
            <img
              key={url}
              alt=""
              src={url}
              tw="w-12 h-12 rounded-full border-4"
              style={{
                borderColor: bg,
                marginLeft: i > 0 ? "-16px" : "0",
                position: "relative",
                zIndex: 10 - i,
              }}
            />
          ))}
        </div>
      </div>

      {/* Main Content - Tests baseline alignment and dynamic inline styles */}
      <div tw="flex flex-col z-10 relative mt-12">
        <div tw="flex items-end mb-2">
          <p
            tw="text-8xl font-extrabold tracking-tighter leading-none m-0"
            style={{ color: textMain }}
          >
            {stat}
          </p>
          <div
            tw="flex items-center px-4 py-2 rounded-full ml-6 mb-2"
            style={{
              backgroundColor: trend.isPositive
                ? "rgba(34, 197, 94, 0.15)"
                : "rgba(239, 68, 68, 0.15)",
              color: trend.isPositive ? "#16a34a" : "#dc2626",
            }}
          >
            <svg
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="3"
              tw="mr-2"
            >
              {trend.isPositive ? (
                <path d="M23 6l-9.5 9.5-5-5L1 18" />
              ) : (
                <path d="M23 18l-9.5-9.5-5 5L1 6" />
              )}
            </svg>
            <span tw="text-xl font-bold">{trend.value}</span>
          </div>
        </div>
        <p tw="text-2xl font-medium m-0" style={{ color: textMuted }}>
          {label}
        </p>
      </div>

      {/* Sparkline Chart - Tests math inside components and dynamic height percentages */}
      <div tw="flex items-end justify-between w-full h-32 mt-12 z-10 relative">
        {sparkline.map((val, i) => {
          const max = Math.max(...sparkline);
          const heightPct = (val / max) * 100;
          const isMax = val === max;

          return (
            <div
              key={i}
              tw="flex flex-col items-center justify-end w-12 h-full"
            >
              <div
                tw="w-full rounded-t-md"
                style={{
                  backgroundColor: isMax ? accentColor : `${accentColor}40`,
                  height: `${heightPct}%`,
                }}
              />
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default ComplexStatCard;
