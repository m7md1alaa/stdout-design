import { defineSchema } from "@stdout-design/core/schema";
import { z } from "zod";

// Thin studio-preview shim around the real production component -- keeps
// DocsOgTemplate itself free of the Zod propsSchema the studio's template
// contract requires, since the Next.js OG route doesn't need one.
import { DocsOgTemplate } from "../../apps/web-docs/src/components/og/docs-template";

export const templateId = "docs-og" as const;

export const propsSchema = defineSchema(
  z.object({
    description: z
      .string()
      .default(
        "Filters, blend modes, and dithering — the Takumi compositing layer under stdout-design."
      )
      .describe("Supporting text below the title (truncated at 130 chars)"),
    siteName: z.string().default("stdout-design docs"),
    title: z.string().default("Visual Effects"),
  })
);

export type Props = z.infer<typeof propsSchema>;

const DocsOgPreview = (props: Props) => <DocsOgTemplate {...props} />;

export default DocsOgPreview;
