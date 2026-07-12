export const validateProjectName = (name: string): string | null => {
  if (name.length === 0) {
    return "Project name cannot be empty.";
  }

  if (name.length > 214) {
    return "Project name must be 214 characters or fewer.";
  }

  if (!/^[a-z0-9][a-z0-9._-]*$/u.test(name)) {
    return "Project name must start with a lowercase letter or number, and can only contain letters, numbers, dots, hyphens, and underscores.";
  }

  if (!/^[a-z0-9]/u.test(name)) {
    return "Project name must start with a lowercase letter or number.";
  }

  if (/[._-]$/u.test(name)) {
    return "Project name must not end with a dot, hyphen, or underscore.";
  }

  if (/__/u.test(name)) {
    return "Project name must not contain consecutive underscores.";
  }

  if (/[._-]{2,}/u.test(name)) {
    return "Project name must not contain consecutive dots, hyphens, or underscores.";
  }

  return null;
};
