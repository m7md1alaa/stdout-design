import { existsSync, readFileSync } from "node:fs";
import { writeFile } from "node:fs/promises";
import path from "node:path";

import { loadConfig } from "@stdout-design/core";

import { updatePackageJsonDeps } from "./init/deps.js";
import { mergeConfig } from "./init/merge-config.js";
import { getLatestVersion } from "./init/registry.js";
import { copyStaticAssets, getDefaults } from "./init/scaffold.js";
import { getScaffoldVersion } from "./init/version.js";

const DEPRECATED_PRESET_IDS = new Set<string>();

const compareVersions = (a: string, b: string): number => {
  const partsA = a.split(".").map(Number);
  const partsB = b.split(".").map(Number);
  const length = Math.max(partsA.length, partsB.length);

  for (let i = 0; i < length; i += 1) {
    const diff = (partsA[i] ?? 0) - (partsB[i] ?? 0);
    if (diff !== 0) {
      return diff;
    }
  }

  return 0;
};

const serializeConfig = (config: unknown): string =>
  `import type { StudioConfig } from "@stdout-design/cli";

const config: StudioConfig = ${JSON.stringify(config, null, 2)};

export default config;
`;

export interface UpdateDeps {
  getInstalledVersion?: () => string;
  getLatestVersion?: () => Promise<string | null>;
}

const resolveVersion = async (
  deps?: UpdateDeps
): Promise<string | undefined> => {
  const installed = (deps?.getInstalledVersion ?? getScaffoldVersion)();
  const latest = await (deps?.getLatestVersion ?? getLatestVersion)();

  if (
    latest !== null &&
    installed !== "latest" &&
    compareVersions(latest, installed) > 0
  ) {
    console.log(`CLI v${installed} is installed, but v${latest} is available.`);
    console.log(
      "Run `npm install @stdout-design/cli@latest` first, then re-run `studio update`."
    );
    return undefined;
  }

  return installed;
};

const printChanges = (summary: ChangeSummary, installedVersion: string) => {
  console.log("");
  if (summary.oldVersion !== summary.newVersion) {
    console.log(
      `  scaffoldVersion  ${summary.oldVersion ?? "(none)"} -> ${summary.newVersion}`
    );
  }
  for (const id of summary.addedPresets) {
    console.log(`  presets          +${id}`);
  }
  for (const id of summary.deprecatedPresets) {
    console.log(`  presets          ! ${id} (deprecated)`);
  }
  for (const id of summary.addedTemplates) {
    console.log(`  templates        +${id}`);
  }
  console.log(
    "  assets           tsconfig.json, .gitignore, types.d.ts (overwrite)"
  );
  console.log(
    `  deps             @stdout-design/cli ^x -> ^${installedVersion}`
  );
  console.log("");
};

export const update = async (
  projectDir: string | undefined,
  options?: { yes?: boolean },
  deps?: UpdateDeps
): Promise<void> => {
  const cwd = process.cwd();
  const dir = path.resolve(cwd, projectDir ?? ".");
  const configPath = path.resolve(dir, "studio.config.ts");

  const existingConfig = await loadConfig(dir);

  const defaults = getDefaults();
  const installedVersion = await resolveVersion(deps);
  if (installedVersion === undefined) {
    return;
  }

  const { config: merged, summary } = mergeConfig(
    existingConfig,
    defaults,
    installedVersion,
    DEPRECATED_PRESET_IDS
  );

  const { intro, outro, confirm } = await import("@clack/prompts");

  intro("studio update");

  const hasChanges =
    summary.addedPresets.length > 0 ||
    summary.deprecatedPresets.length > 0 ||
    summary.addedTemplates.length > 0 ||
    summary.oldVersion !== summary.newVersion;

  if (!hasChanges) {
    console.log("Project is already up to date.");
    outro("Done");
    return;
  }

  printChanges(summary, installedVersion);

  if (!options?.yes) {
    const confirmed = await confirm({
      initialValue: true,
      message: "Apply these changes?",
    });

    if (!confirmed) {
      console.log("Cancelled.");
      outro("Done");
      return;
    }
  }

  await writeFile(configPath, serializeConfig(merged));
  await copyStaticAssets(dir);

  const pkgPath = path.resolve(dir, "package.json");
  if (existsSync(pkgPath)) {
    const pkgContent = readFileSync(pkgPath, "utf-8");
    const { updated, changed } = updatePackageJsonDeps(
      pkgContent,
      installedVersion
    );
    if (changed) {
      await writeFile(pkgPath, updated);
    }
  }

  console.log("");
  outro("Done");
};
