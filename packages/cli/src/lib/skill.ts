// oxlint-disable typescript/no-non-null-assertion
import { spawnSync } from "node:child_process";

import type { AgentName } from "package-manager-detector";

const DLX_MAP: Partial<Record<AgentName, string>> = {
  bun: "bunx",
  npm: "npx",
  pnpm: "pnpm dlx",
  yarn: "yarn dlx",
};

const STUDIO_SKILL_REPO = "m7md1alaa/stdout-design";
const STUDIO_SKILL_NAME = "studio";

const buildSkillListCommand = (
  pm: AgentName,
  global = false
): { command: string; args: string[] } => {
  const dlx = DLX_MAP[pm] ?? "npx";
  const parts = dlx.split(" ");
  const args = [
    ...parts.slice(1),
    "skills",
    "list",
    ...(global ? ["-g"] : []),
    "--json",
  ];
  return { args, command: parts[0]! };
};

const buildSkillInstallCommand = (
  pm: AgentName
): { command: string; args: string[] } => {
  const dlx = DLX_MAP[pm] ?? "npx";
  const parts = dlx.split(" ");
  const args = [...parts.slice(1), "skills", "add", STUDIO_SKILL_REPO];
  return { args, command: parts[0]! };
};

const isSkillInstalledInScope = (pm: AgentName, global = false): boolean => {
  const { command, args } = buildSkillListCommand(pm, global);
  const result = spawnSync(command, args, {
    encoding: "utf-8",
    stdio: "pipe",
  });

  if (result.error || result.status !== 0 || !result.stdout) {
    return false;
  }

  const { stdout } = result;

  try {
    const installedSkills = JSON.parse(stdout) as {
      name?: string;
    }[];

    return installedSkills.some((skill) => skill.name === STUDIO_SKILL_NAME);
  } catch {
    return false;
  }
};

const hasSkillInstalled = (pm: AgentName): boolean =>
  isSkillInstalledInScope(pm) || isSkillInstalledInScope(pm, true);

export const getSkillInstallCommand = (pm: AgentName): string => {
  const { command, args } = buildSkillInstallCommand(pm);
  return `${command} ${args.join(" ")}`;
};

export interface MaybeInstallSkillOptions {
  packageManager: AgentName;
  quiet?: boolean;
  shouldInstall?: boolean;
}

export const maybeInstallSkill = async ({
  packageManager,
  quiet = false,
  shouldInstall,
}: MaybeInstallSkillOptions): Promise<boolean> => {
  if (
    shouldInstall === undefined &&
    !quiet &&
    hasSkillInstalled(packageManager)
  ) {
    return true;
  }

  let wantsInstall = shouldInstall;

  if (wantsInstall === undefined) {
    if (quiet) {
      return false;
    }

    const { select, isCancel } = await import("@clack/prompts");
    const installSkillResult = await select({
      message: "Do you want to install the studio agent skill?",
      options: [
        {
          label: "Yes, install it",
          value: "install",
        },
        {
          label: "No, I'll do it later",
          value: "skip",
        },
      ],
    });

    if (isCancel(installSkillResult)) {
      return false;
    }

    wantsInstall = installSkillResult === "install";
  }

  if (!wantsInstall) {
    return false;
  }

  const { command, args } = buildSkillInstallCommand(packageManager);
  const { spinner } = await import("@clack/prompts");
  const s = spinner();

  if (!quiet) {
    s.start("Installing the studio agent skill...");
  }

  const result = spawnSync(command, args, {
    stdio: "pipe",
  });
  const didInstall = !result.error && result.status === 0;

  if (!quiet) {
    s.stop(
      didInstall
        ? "Studio agent skill installed."
        : "Couldn't install the studio agent skill automatically."
    );
  }

  return didInstall;
};
