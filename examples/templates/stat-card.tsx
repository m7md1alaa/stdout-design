import { z } from "zod";

export const templateId = "stat-card" as const;

export const propsSchema = z.object({
  title: z.string().min(1).describe("The headline above the stat"),
  stat: z.string().min(1).describe("The big number or value to display"),
  label: z.string().default("").describe("Supporting text below the stat"),
  accentColor: z.string().default("#6366f1").describe("Accent color for the stat value"),
});

export type Props = z.infer<typeof propsSchema>;

export default function StatCard({ title, stat, label, accentColor }: Props) {
  return (
    <div tw="flex flex-col items-center justify-center w-full h-full bg-white p-12">
      <p tw="text-lg text-gray-500 mb-3 tracking-wide uppercase">{title}</p>
      <p tw="text-8xl font-bold leading-none" style={{ color: accentColor }}>
        {stat}
      </p>
      {label ? <p tw="text-base text-gray-400 mt-4">{label}</p> : null}
    </div>
  );
}
