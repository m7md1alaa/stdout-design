import { spawnSync } from "node:child_process";
import { existsSync } from "node:fs";
import path from "node:path";

import { tryGitInit } from "./init/git.js";
import type { ClackModule } from "./init/prompts.js";
import { collectPrompts } from "./init/prompts.js";
import { scaffold } from "./init/scaffold.js";

type PackageManager = "bun" | "npm" | "pnpm" | "yarn";

const detectPackageManager = (): PackageManager => {
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

const getInstallCommand = (pm: PackageManager): [string, string[]] => {
  const commands: Record<PackageManager, [string, string[]]> = {
    bun: ["bun", ["install"]],
    npm: ["npm", ["install"]],
    pnpm: ["pnpm", ["install"]],
    yarn: ["yarn", ["install"]],
  };
  return commands[pm];
};

const runInstall = (dir: string, pm: PackageManager): void => {
  const [cmd, args] = getInstallCommand(pm);
  spawnSync(cmd, args, { cwd: dir, stdio: "inherit" });
};

export { scaffold } from "./init/scaffold.js";
export type { ScaffoldOptions } from "./init/scaffold.js";
export { detectPackageManager };

export const init = async (
  projectDir: string | undefined,
  options?: { yes?: boolean }
): Promise<void> => {
  const { intro, outro, spinner } = await import("@clack/prompts");

  intro("studio init");

  const cwd = process.cwd();

  if (existsSync(path.resolve(cwd, projectDir ?? ".", "studio.config.ts"))) {
    console.log("studio.config.ts already exists — skipping scaffold.");
    outro("Done");
    return;
  }

  const clack = (await import("@clack/prompts")) as unknown as ClackModule;
  const collected = await collectPrompts(clack, projectDir, options);

  const s = spinner();
  s.start("Creating project...");
  await scaffold(collected.resolvedDir, {
    git: collected.wantsGit,
    install: collected.shouldInstall,
    locales: collected.locales,
    projectName: collected.projectName,
    templates: collected.templates,
  });
  s.stop("Project created");

  if (collected.wantsGit) {
    const gitSpinner = spinner();
    gitSpinner.start("Initializing git...");
    const initialized = tryGitInit(collected.resolvedDir);
    gitSpinner.stop(
      initialized
        ? "Git initialized"
        : "Git repo already exists or git is not available"
    );
  }

  const pm = detectPackageManager();

  if (collected.shouldInstall) {
    const installSpinner = spinner();
    installSpinner.start("Installing dependencies...");
    runInstall(collected.resolvedDir, pm);
    installSpinner.stop("Dependencies installed");
  }

  console.log("");
  console.log(`  Created project at ${collected.resolvedDir}`);
  console.log("");
  console.log("  Next steps:");
  console.log(`    cd ${path.relative(cwd, collected.resolvedDir) || "."}`);
  console.log(`    ${pm} run dev`);
  console.log("");

  outro("Done");
};
