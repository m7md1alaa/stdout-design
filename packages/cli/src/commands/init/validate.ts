import { z } from "zod";

const projectNameSchema = z
  .string()
  .min(1, "Project name cannot be empty.")
  .max(214, "Project name must be 214 characters or fewer.")
  .regex(
    /^[a-z0-9][a-z0-9._-]*$/u,
    "Project name must start with a lowercase letter or number, and can only contain letters, numbers, dots, hyphens, and underscores."
  )
  .refine(
    (val) => !/[._-]$/u.test(val),
    "Project name must not end with a dot, hyphen, or underscore."
  )
  .refine(
    (val) => !/__/u.test(val),
    "Project name must not contain consecutive underscores."
  )
  .refine(
    (val) => !/[._-]{2,}/u.test(val),
    "Project name must not contain consecutive dots, hyphens, or underscores."
  );

export const validateProjectName = (name: string): string | null => {
  const result = projectNameSchema.safeParse(name);
  if (!result.success) {
    return result.error.issues[0]?.message ?? "Invalid project name.";
  }
  return null;
};
