import { z } from "zod";

export const templateId = "bento-feature" as const;

export const propsSchema = z.object({
  background: z.string().default("#0a0a0a").describe("Background color"),
  description: z.string().default("").describe("Supporting description text"),
  headline: z.string().min(1).describe("Main headline for the feature card"),
  image: z.string().url().describe("URL to the feature image"),
  tags: z.array(z.string()).default([]).describe("Feature tags or badges"),
});

export type Props = z.infer<typeof propsSchema>;

export default function BentoFeature({
  headline,
  description,
  image,
  tags,
  background,
}: Props) {
  return (
    <div
      tw="flex w-full h-full p-8"
      style={{ backgroundColor: background, color: "#ffffff" }}
    >
      <div tw="flex flex-col justify-between flex-1 pr-8">
        {tags.length > 0 ? (
          <div tw="flex flex-wrap gap-2">
            {tags.map((tag) => (
              <span
                key={tag}
                tw="text-xs font-medium bg-white/10 rounded-full px-3 py-1"
              >
                {tag}
              </span>
            ))}
          </div>
        ) : null}
        <div>
          <h2 tw="text-4xl font-bold mb-3 leading-tight">{headline}</h2>
          {description ? (
            <p tw="text-lg text-gray-400 leading-relaxed max-w-md">
              {description}
            </p>
          ) : null}
        </div>
      </div>
      <div tw="flex-1">
        <img src={image} tw="w-full h-full object-cover rounded-2xl" alt="" />
      </div>
    </div>
  );
}
