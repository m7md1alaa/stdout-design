import { z } from "zod";

export const templateId = "quote-card" as const;

export const propsSchema = z.object({
  quote: z.string().min(1).describe("The quoted text"),
  author: z.string().min(1).describe("Name of the person being quoted"),
  role: z.string().default("").describe("Role or title of the author"),
  avatarUrl: z.string().url().describe("URL to the author's avatar image"),
  background: z.string().default("#1e1b4b").describe("Background color"),
});

export type Props = z.infer<typeof propsSchema>;

export default function QuoteCard({ quote, author, role, avatarUrl, background }: Props) {
  return (
    <div
      tw="flex flex-col items-center justify-center w-full h-full p-16"
      style={{ backgroundColor: background, color: "#ffffff" }}
    >
      <div tw="max-w-2xl flex flex-col items-center text-center">
        <p tw="text-3xl leading-relaxed italic mb-10 text-white/90">
          &ldquo;{quote}&rdquo;
        </p>
        <div tw="flex items-center gap-4">
          <img
            src={avatarUrl}
            tw="w-14 h-14 rounded-full object-cover"
            alt=""
          />
          <div tw="flex flex-col items-start">
            <p tw="text-lg font-semibold">{author}</p>
            {role ? <p tw="text-sm text-gray-400">{role}</p> : null}
          </div>
        </div>
      </div>
    </div>
  );
}
