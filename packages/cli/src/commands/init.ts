import { spawnSync } from "node:child_process";
import { existsSync } from "node:fs";
import path from "node:path";

import { isInsideGitRepo, tryGitInit } from "./init/git.js";
import type { ScaffoldOptions } from "./init/scaffold.js";
import { scaffold } from "./init/scaffold.js";
import { validateProjectName } from "./init/validate.js";

const detectPackageManager = (): "bun" | "npm" | "pnpm" | "yarn" => {
  const userAgent = process.env.npm_config_user_agent ?? "";
  if (userAgent.includes("bun")) {
    return "bun";
  }
  if (userAgent.includes("pnpm")) {
    return "pnpm";
  }
  if (userAgent.includes("yarn")) {
    return "yarn";
  }
  if (existsSync(path.join(process.cwd(), "bun.lock"))) {
    return "bun";
  }
  if (existsSync(path.join(process.cwd(), "pnpm-lock.yaml"))) {
    return "pnpm";
  }
  if (existsSync(path.join(process.cwd(), "yarn.lock"))) {
    return "yarn";
  }
  if (existsSync(path.join(process.cwd(), "package-lock.json"))) {
    return "npm";
  }
  return "npm";
};

const getInstallCommand = (
  pm: "bun" | "npm" | "pnpm" | "yarn"
): [string, string[]] => {
  const commands: Record<string, [string, string[]]> = {
    bun: ["bun", ["install"]],
    npm: ["npm", ["install"]],
    pnpm: ["pnpm", ["install"]],
    yarn: ["yarn", ["install"]],
  };
  return commands[pm];
};

const runInstall = (dir: string, pm: "bun" | "npm" | "pnpm" | "yarn"): void => {
  const [cmd, args] = getInstallCommand(pm);
  spawnSync(cmd, args, { cwd: dir, stdio: "inherit" });
};

const isCI = (): boolean =>
  process.env.CI === "true" ||
  process.env.CI === "1" ||
  process.env.CIRCLECI === "true" ||
  Boolean(process.env.GITHUB_ACTIONS) ||
  Boolean(process.env.GITLAB_CI);

const ciOrYes = (options?: { yes?: boolean }): boolean =>
  options?.yes === true || isCI();

interface ClackModule {
  text: (opts: Record<string, unknown>) => Promise<string | symbol>;
  confirm: (opts: {
    initialValue: boolean;
    message: string;
  }) => Promise<boolean | symbol>;
  multiselect: (opts: {
    message: string;
    options: { label: string; value: string; hint?: string }[];
  }) => Promise<string[] | symbol>;
}

const promptOrSkip = async <T>(
  fn: (p: ClackModule) => Promise<T | symbol>,
  isCancel: (v: unknown) => boolean,
  cancel: (msg: string) => void
): Promise<T> => {
  const clack = await import("@clack/prompts");
  const result = await fn(clack as ClackModule);
  if (isCancel(result)) {
    cancel("Cancelled.");
    process.exit(0);
  }
  return result as T;
};

export { scaffold } from "./init/scaffold.js";
export type { ScaffoldOptions } from "./init/scaffold.js";

export const init = async (
  projectDir: string | undefined,
  options?: { yes?: boolean }
): Promise<void> => {
  const { intro, outro, cancel, isCancel, spinner } =
    await import("@clack/prompts");

  intro("studio init");

  const cwd = process.cwd();

  if (existsSync(path.resolve(cwd, projectDir ?? ".", "studio.config.ts"))) {
    console.log("studio.config.ts already exists — skipping scaffold.");
    outro("Done");
    return;
  }

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
      isCancel,
      cancel
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
      isCancel,
      cancel
    );
    if (!shouldOverwrite) {
      cancel("Cancelled.");
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
        isCancel,
        cancel
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
        isCancel,
        cancel
      );

  const parentDir = path.dirname(resolvedDir);
  const alreadyInGitRepo = isInsideGitRepo(parentDir);

  const wantsGit = (() => {
    if (alreadyInGitRepo) {
      return false;
    }
    if (ciOrYes(options)) {
      return true;
    }
    return promptOrSkip(
      (p) =>
        p.confirm({
          initialValue: true,
          message: "Initialize a git repository?",
        }),
      isCancel,
      cancel
    );
  })();

  const shouldInstall = ciOrYes(options)
    ? true
    : await promptOrSkip(
        (p) =>
          p.confirm({
            initialValue: true,
            message: "Install dependencies?",
          }),
        isCancel,
        cancel
      );

  const scaffoldOpts: ScaffoldOptions = {
    git: wantsGit as boolean,
    install: shouldInstall as boolean,
    locales,
    projectName,
    templates,
  };

  const s = spinner();
  s.start("Creating project...");
  await scaffold(resolvedDir, scaffoldOpts);
  s.stop("Project created");

  if (scaffoldOpts.git) {
    const gitSpinner = spinner();
    gitSpinner.start("Initializing git...");
    const initialized = tryGitInit(resolvedDir);
    gitSpinner.stop(
      initialized
        ? "Git initialized"
        : "Git repo already exists or git is not available"
    );
  }

  const pm = detectPackageManager();

  if (scaffoldOpts.install) {
    const installSpinner = spinner();
    installSpinner.start("Installing dependencies...");
    runInstall(resolvedDir, pm);
    installSpinner.stop("Dependencies installed");
  }

  console.log("");
  console.log(`  Created project at ${resolvedDir}`);
  console.log("");
  console.log("  Next steps:");
  console.log(`    cd ${path.relative(cwd, resolvedDir) || "."}`);
  console.log(`    ${pm} run dev`);
  console.log("");

  outro("Done");
};
