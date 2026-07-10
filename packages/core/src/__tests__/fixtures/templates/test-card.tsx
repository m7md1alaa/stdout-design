import { createElement } from "react";
import { z } from "zod";

export const propsSchema = z.object({ label: z.string() });

export type Props = z.infer<typeof propsSchema>;

export default function TestCard({ label }: Props) {
  return createElement("div", null, label);
}
