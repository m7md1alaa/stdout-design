import { existsSync, readFileSync } from "node:fs";
import { writeFile } from "node:fs/promises";
import path from "node:path";
import { pathToFileURL } from "node:url";

import { updatePackageJsonDeps } from "./init/deps.js";
import { mergeConfig } from "./init/merge-config.js";
import { copyStaticAssets, getDefaults } from "./init/scaffold.js";
import { getScaffoldVersion } from "./init/version.js";

const DEPRECATED_PRESET_IDS = new Set<string>();

const serializeConfig = (config: unknown): string =>
  `import type { StudioConfig } from "@stdout-design/cli";

const config: StudioConfig = ${JSON.stringify(config, null, 2)};

export default config;
`;

export const update = async (
  projectDir: string | undefined,
  options?: { yes?: boolean }
): Promise<void> => {
  const cwd = process.cwd();
  const dir = path.resolve(cwd, projectDir ?? ".");
  const configPath = path.resolve(dir, "studio.config.ts");

  if (!existsSync(configPath)) {
    throw new Error("No studio project found. Run `studio init` first.");
  }

  const existingModule = await import(pathToFileURL(configPath).href);
  const existing = (existingModule.default ?? existingModule) as Record<
    string,
    unknown
  >;

  const existingConfig = {
    defaultPreset: existing.defaultPreset as string | undefined,
    outDir: existing.outDir as string | undefined,
    presets: (existing.presets ?? []) as {
      id: string;
      width: number;
      height: number;
      platform: string;
      deprecated?: boolean;
    }[],
    scaffoldVersion: existing.scaffoldVersion as string | undefined,
    templates: (existing.templates ?? {}) as Record<
      string,
      { componentPath: string; description?: string }
    >,
  };

  const defaults = getDefaults();
  const currentVersion = getScaffoldVersion();

  const { config: merged, summary } = mergeConfig(
    existingConfig,
    defaults,
    currentVersion,
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
  console.log(`  deps             @stdout-design/cli ^x -> ^${currentVersion}`);
  console.log("");

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
      currentVersion
    );
    if (changed) {
      await writeFile(pkgPath, updated);
    }
  }

  console.log("");
  outro("Done");
};
