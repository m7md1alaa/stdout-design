import type { z } from "zod";

export class TemplateConfigError extends Error {
  public readonly issues: z.ZodIssue[];

  constructor(message: string, issues: z.ZodIssue[]) {
    super(message);
    this.name = "TemplateConfigError";
    this.issues = issues;
  }
}
