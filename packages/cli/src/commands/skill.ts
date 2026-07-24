import { detect as detectPM } from "package-manager-detector/detect";

import { getSkillInstallCommand, maybeInstallSkill } from "../lib/skill.js";

export const skillInstall = async (options?: {
  yes?: boolean;
}): Promise<void> => {
  const { intro, outro, log } = await import("@clack/prompts");

  intro("studio skill install");

  const cwd = process.cwd();
  const detected = await detectPM({ cwd });
  const packageManager = detected?.name ?? "npm";

  const installed = await maybeInstallSkill({
    packageManager,
    quiet: options?.yes ?? false,
  });

  if (installed) {
    outro("Done");
    return;
  }

  if (!options?.yes) {
    log.step(
      `You can install it later with \`${getSkillInstallCommand(packageManager)}\`.`
    );
  }

  outro("Done");
};
