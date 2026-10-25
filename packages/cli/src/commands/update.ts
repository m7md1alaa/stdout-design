import { existsSync, readdirSync, readFileSync } from "node:fs";
import { writeFile } from "node:fs/promises";
import path from "node:path";

import { loadConfig } from "@stdout-design/core";
import type { StudioConfig } from "@stdout-design/core";

import { isStarterId } from "./init/catalog.js";
import type { StarterId } from "./init/catalog.js";
import { updatePackageJsonDeps } from "./init/deps.js";
import { hasChanges, mergeConfig } from "./init/merge-config.js";
import type { Defaults, ChangeSummary } from "./init/merge-config.js";
import { buildProjectConfig, startersSince } from "./init/project-config.js";
import { getLatestVersion } from "./init/registry.js";
import {
  addStarterLocaleStrings,
  copyStarterFiles,
  copyStaticAssets,
} from "./init/scaffold.js";
import { serializeConfig } from "./init/serialize-config.js";
import { compareVersions, getScaffoldVersion } from "./init/version.js";

const DEPRECATED_PRESET_IDS = new Set<string>();

// Projects from before `locales` was recorded: read them off the locale files.
const localesOnDisk = (dir: string): string[] => {
  const localesDir = path.resolve(dir, "locales");
  if (!existsSync(localesDir)) {
    return [];
  }
  return readdirSync(localesDir)
    .filter((file) => file.endsWith(".json"))
    .map((file) => file.slice(0, -".json".length))
    .toSorted();
};

export interface UpdatePlan {
  mergedConfig: StudioConfig;
  summary: ChangeSummary;
  installedVersion: string;
  /** The starters this update registers, whose files it writes. */
  starters: StarterId[];
  /** The project's locales, which get the new starters' strings. */
  locales: string[];
}

export interface UpdateDeps {
  getInstalledVersion?: () => string;
  getLatestVersion?: () => Promise<string | null>;
}

export const planUpdate = (
  existingConfig: StudioConfig,
  defaults: Defaults,
  installedVersion: string,
  deprecatedPresetIds: Set<string>
): UpdatePlan => {
  const { config: mergedConfig, summary } = mergeConfig(
    existingConfig,
    defaults,
    installedVersion,
    deprecatedPresetIds
  );
  return {
    installedVersion,
    locales: mergedConfig.locales ?? [],
    mergedConfig,
    starters: summary.addedTemplates.filter(isStarterId),
    summary,
  };
};

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
  for (const font of summary.addedFonts) {
    console.log(`  fonts            +${font}`);
  }
  if (summary.recordedLocales.length > 0) {
    console.log(
      `  locales          ${summary.recordedLocales.join(", ")} (recorded)`
    );
  }
  console.log(
    "  assets           tsconfig.json, .gitignore, types.d.ts (overwrite)"
  );
  console.log(
    `  deps             @stdout-design/cli ^x -> ^${installedVersion}`
  );
  console.log("");
};

export const applyUpdate = async (
  dir: string,
  plan: UpdatePlan
): Promise<void> => {
  // Files first, config last: if copying fails, the config still matches
  // what is on disk. A registered starter needs its template and its copy;
  // files and entries the project already has are never overwritten.
  await copyStarterFiles(dir, plan.starters, { force: false });
  await addStarterLocaleStrings(dir, plan.locales, plan.starters);
  await copyStaticAssets(dir);
  await writeFile(
    path.resolve(dir, "studio.config.ts"),
    serializeConfig(plan.mergedConfig)
  );

  const pkgPath = path.resolve(dir, "package.json");
  if (existsSync(pkgPath)) {
    const pkgContent = readFileSync(pkgPath, "utf-8");
    const { updated, changed } = updatePackageJsonDeps(
      pkgContent,
      plan.installedVersion
    );
    if (changed) {
      await writeFile(pkgPath, updated);
    }
  }
};

export const update = async (
  projectDir: string | undefined,
  options?: { yes?: boolean },
  deps?: UpdateDeps
): Promise<void> => {
  const cwd = process.cwd();
  const dir = path.resolve(cwd, projectDir ?? ".");

  const existingConfig = await loadConfig(dir);

  const installedVersion = await resolveVersion(deps);
  if (installedVersion === undefined) {
    return;
  }

  // What the project would get from `init` today, limited to the starters
  // it has never been offered.
  const defaults = buildProjectConfig(installedVersion, {
    locales: existingConfig.locales ?? localesOnDisk(dir),
    starters: startersSince(existingConfig.scaffoldVersion, installedVersion),
  });

  const plan = planUpdate(
    existingConfig,
    defaults,
    installedVersion,
    DEPRECATED_PRESET_IDS
  );

  const { intro, outro, confirm } = await import("@clack/prompts");

  intro("studio update");

  if (!hasChanges(plan.summary)) {
    console.log("Project is already up to date.");
    outro("Done");
    return;
  }

  printChanges(plan.summary, plan.installedVersion);

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

  await applyUpdate(dir, plan);

  console.log("");
  outro("Done");
};
