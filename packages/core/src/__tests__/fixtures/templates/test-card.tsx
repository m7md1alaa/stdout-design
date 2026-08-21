import { createElement } from "react";
import { z } from "zod";

export const propsSchema = z.object({ label: z.string() });

export type Props = z.infer<typeof propsSchema>;

const TestCard = ({ label }: Props) => createElement("div", null, label);

export default TestCard;
