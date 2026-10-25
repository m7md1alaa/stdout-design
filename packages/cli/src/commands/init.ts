import { spawnSync } from "node:child_process";
import { existsSync } from "node:fs";
import path from "node:path";

import type { AgentName } from "package-manager-detector";
import { resolveCommand } from "package-manager-detector/commands";
import {
  detect as detectPM,
  getUserAgent,
} from "package-manager-detector/detect";

import { maybeInstallSkill } from "../lib/skill.js";
import { tryGitInit } from "./init/git.js";
import type { ClackModule } from "./init/prompts.js";
import { collectPrompts } from "./init/prompts.js";
import { scaffold } from "./init/scaffold.js";

type PackageManager = AgentName;

const detectPackageManager = async (cwd?: string): Promise<PackageManager> => {
  const detected = await detectPM({ cwd });
  if (detected) {
    return detected.name;
  }

  // No lockfile around (a fresh directory): fall back to the package manager
  // that launched us (`bunx`, `pnpm dlx`, ...) rather than assuming npm.
  return getUserAgent() ?? "npm";
};

const runInstall = (dir: string, pm: PackageManager): boolean => {
  const resolved = resolveCommand(pm, "install", []);
  if (!resolved) {
    return false;
  }
  const { command, args } = resolved;
  const result = spawnSync(command, args, { cwd: dir, stdio: "inherit" });
  return result.status === 0;
};

export { scaffold } from "./init/scaffold.js";
export type { ScaffoldOptions } from "./init/scaffold.js";
export { detectPackageManager };

export const init = async (
  projectDir: string | undefined,
  options?: { yes?: boolean; installSkill?: boolean }
): Promise<void> => {
  const { intro, log, outro, spinner } = await import("@clack/prompts");

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

  const pm = await detectPackageManager(cwd);

  let installFailed = false;
  if (collected.shouldInstall) {
    // No spinner here: the install streams its own output, and a spinner
    // redrawing over it garbles the terminal.
    log.step(`Installing dependencies with ${pm}...`);
    installFailed = !runInstall(collected.resolvedDir, pm);
    if (installFailed) {
      log.error(
        `Dependency install failed. Fix the error above, then run \`${pm} install\` in the project.`
      );
    } else {
      log.success("Dependencies installed");
    }
  }

  await maybeInstallSkill({
    packageManager: pm,
    quiet: options?.yes ?? false,
    shouldInstall: options?.installSkill,
  });

  console.log("");
  console.log(`  Created project at ${collected.resolvedDir}`);
  console.log("");
  const relativeDir = path.relative(cwd, collected.resolvedDir);
  console.log("  Next steps:");
  if (relativeDir) {
    console.log(`    cd ${relativeDir}`);
  }
  if (installFailed || !collected.shouldInstall) {
    console.log(`    ${pm} install`);
  }
  console.log(`    ${pm} run dev                         # live studio`);
  console.log(`    ${pm} run render bento-feature        # render to ./out`);
  console.log("");

  outro("Done");

  if (installFailed) {
    process.exitCode = 1;
  }
};
