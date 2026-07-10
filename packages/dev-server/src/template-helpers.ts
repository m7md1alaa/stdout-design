import { isZodObject } from "@stdout-design/core";
import type { TemplateModule } from "@stdout-design/core";
import type { z } from "zod";

// eslint-disable-next-line func-style
export function validateTemplateModule(
  mod: unknown,
  templateId: string
): TemplateModule {
  const candidate = mod as Partial<TemplateModule> | null | undefined;

  if (!candidate || typeof candidate.default !== "function") {
    throw new Error(
      `Template "${templateId}" must have a default export that is a component function.`
    );
  }

  if (!isZodObject(candidate.propsSchema)) {
    throw new Error(
      `Template "${templateId}" must export a "propsSchema" that is a z.object({...}) describing its props.`
    );
  }

  return candidate as TemplateModule;
}

// eslint-disable-next-line func-style
export function summarizeZodIssues(issues: z.ZodIssue[]): string {
  return issues
    .map((issue) => `${issue.path.join(".") || "(root)"}: ${issue.message}`)
    .join("; ");
}
