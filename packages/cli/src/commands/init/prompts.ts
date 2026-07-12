import { existsSync } from "node:fs";
import path from "node:path";

import { isInsideGitRepo } from "./git.js";
import { validateProjectName } from "./validate.js";

export interface ClackModule {
  text: (opts: Record<string, unknown>) => Promise<string | symbol>;
  confirm: (opts: {
    initialValue: boolean;
    message: string;
  }) => Promise<boolean | symbol>;
  multiselect: (opts: {
    message: string;
    options: { label: string; value: string; hint?: string }[];
  }) => Promise<string[] | symbol>;
  isCancel: (value: unknown) => boolean;
  cancel: (message: string) => void;
}

export interface CollectedPrompts {
  resolvedDir: string;
  projectName: string;
  templates: string[];
  locales: string[];
  wantsGit: boolean;
  shouldInstall: boolean;
}

const isCI = (): boolean =>
  process.env.CI === "true" ||
  process.env.CI === "1" ||
  process.env.CIRCLECI === "true" ||
  Boolean(process.env.GITHUB_ACTIONS) ||
  Boolean(process.env.GITLAB_CI);

const ciOrYes = (options?: { yes?: boolean }): boolean =>
  options?.yes === true || isCI();

const promptOrSkip = async <T>(
  prompt: (clack: ClackModule) => Promise<T | symbol>,
  clack: ClackModule
): Promise<T> => {
  const result = await prompt(clack);
  if (clack.isCancel(result)) {
    clack.cancel("Cancelled.");
    process.exit(0);
  }
  return result as T;
};

export const collectPrompts = async (
  clack: ClackModule,
  projectDir?: string,
  options?: { yes?: boolean }
): Promise<CollectedPrompts> => {
  const cwd = process.cwd();
  let resolvedDir: string;
  let projectName: string;

  if (projectDir) {
    resolvedDir = path.resolve(cwd, projectDir);
    projectName = path.basename(resolvedDir);
  } else if (ciOrYes(options)) {
    projectName = "studio-project";
    resolvedDir = path.resolve(cwd, projectName);
  } else {
    const name = await promptOrSkip(
      (p) =>
        p.text({
          defaultValue: "studio-project",
          message: "What's your project name?",
          validate: (value: string) => {
            const trimmed = value.trim();
            if (trimmed.length === 0) {
              return "Please enter a project name.";
            }
            return validateProjectName(trimmed);
          },
        }),
      clack
    );

    projectName = (name as string).trim();
    resolvedDir = path.resolve(cwd, projectName);
  }

  if (!ciOrYes(options) && existsSync(resolvedDir)) {
    const shouldOverwrite = await promptOrSkip(
      (p) =>
        p.confirm({
          initialValue: false,
          message: `Directory "${projectName}" already exists. Overwrite?`,
        }),
      clack
    );

    if (!shouldOverwrite) {
      clack.cancel("Cancelled.");
      process.exit(0);
    }
  }

  const templates = ciOrYes(options)
    ? ["bento-feature"]
    : await promptOrSkip(
        (p) =>
          p.multiselect({
            message: "Which templates would you like to scaffold?",
            options: [
              {
                hint: "Apple-style feature card",
                label: "Bento Feature",
                value: "bento-feature",
              },
            ],
          }),
        clack
      );

  const locales = ciOrYes(options)
    ? ["en", "ar"]
    : await promptOrSkip(
        (p) =>
          p.multiselect({
            message: "Which locales would you like to include?",
            options: [
              { label: "English", value: "en" },
              { label: "Arabic", value: "ar" },
            ],
          }),
        clack
      );

  const parentDir = path.dirname(resolvedDir);
  const alreadyInGitRepo = isInsideGitRepo(parentDir);

  let wantsGit = !alreadyInGitRepo && ciOrYes(options);

  if (!alreadyInGitRepo && !ciOrYes(options)) {
    wantsGit = await promptOrSkip(
      (p) =>
        p.confirm({
          initialValue: true,
          message: "Initialize a git repository?",
        }),
      clack
    );
  }

  const shouldInstall = ciOrYes(options)
    ? true
    : await promptOrSkip(
        (p) =>
          p.confirm({
            initialValue: true,
            message: "Install dependencies?",
          }),
        clack
      );

  return {
    locales,
    projectName,
    resolvedDir,
    shouldInstall,
    templates,
    wantsGit: wantsGit as boolean,
  };
};
