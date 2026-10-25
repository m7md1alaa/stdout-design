import { existsSync } from "node:fs";
import { cp, mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

import { isStarterId } from "./catalog.js";
import type { StarterId } from "./catalog.js";
import { buildProjectConfig } from "./project-config.js";
import type { ProjectChoices } from "./project-config.js";
import { serializeConfig } from "./serialize-config.js";
import { getScaffoldVersion } from "./version.js";

export interface ScaffoldOptions {
  projectName: string;
  templates: string[];
  locales: string[];
  install: boolean;
  git: boolean;
}

// oxlint-disable-next-line eslint/sort-keys
const getPkgJson = (name: string, version: string) => ({
  name,
  private: true,
  type: "module",
  scripts: {
    dev: "studio dev",
    render: "studio render",
  },
  dependencies: {
    "@stdout-design/cli": `^${version}`,
    "@stdout-design/dev-server": `^${version}`,
    "@stdout-design/web-ui": `^${version}`,
    "@types/react": "^19.2.17",
    react: "^19.2.7",
    "react-dom": "^19.2.7",
    zod: "^4.4.3",
  },
});

const resolveTemplateDir = (): string => {
  const fromDist = path.resolve(import.meta.dirname, "../template");
  if (existsSync(path.resolve(fromDist, "tsconfig.json"))) {
    return fromDist;
  }
  return path.resolve(import.meta.dirname, "../../../template");
};

const resolveTemplatesDir = (): string =>
  path.resolve(resolveTemplateDir(), "templates");

export const copyStaticAssets = async (dir: string): Promise<void> => {
  const base = resolveTemplateDir();

  await Promise.all([
    cp(path.resolve(base, "tsconfig.json"), path.resolve(dir, "tsconfig.json")),
    cp(path.resolve(base, "gitignore"), path.resolve(dir, ".gitignore")),
    cp(path.resolve(base, "types.d.ts"), path.resolve(dir, "types.d.ts")),
  ]);
};

const generateConfig = async (
  dir: string,
  version: string,
  choices: ProjectChoices
): Promise<void> => {
  await writeFile(
    path.resolve(dir, "studio.config.ts"),
    serializeConfig(buildProjectConfig(version, choices))
  );
};

const generatePackageJson = async (
  dir: string,
  projectName: string,
  version: string
): Promise<void> => {
  await writeFile(
    path.resolve(dir, "package.json"),
    JSON.stringify(getPkgJson(projectName, version), null, 2)
  );
};

/**
 * Copies starter templates into `<dir>/templates`. With `force: false`,
 * existing files are left alone, so `studio update` can add new starters
 * without clobbering a template the user has edited.
 */
export const copyStarterFiles = async (
  dir: string,
  starters: StarterId[],
  { force }: { force: boolean }
): Promise<void> => {
  if (starters.length === 0) {
    return;
  }

  const dstTemplatesDir = path.resolve(dir, "templates");
  await mkdir(dstTemplatesDir, { recursive: true });

  await Promise.all(
    starters.map((id) =>
      cp(
        path.resolve(resolveTemplatesDir(), `${id}.tsx`),
        path.resolve(dstTemplatesDir, `${id}.tsx`),
        { errorOnExist: false, force }
      )
    )
  );
};

type LocaleStrings = Record<string, Record<string, unknown>>;

const readJson = async (file: string): Promise<LocaleStrings> =>
  JSON.parse(await readFile(file, "utf-8")) as LocaleStrings;

const readLocaleSource = (locale: string): Promise<LocaleStrings> => {
  const file = path.resolve(resolveTemplateDir(), "locales", `${locale}.json`);
  // Locales without a translation start from the English copy.
  const fallback = path.resolve(resolveTemplateDir(), "locales", "en.json");
  return readJson(existsSync(file) ? file : fallback);
};

/**
 * Adds each starter's copy to `locales/<code>.json`, creating the file if
 * needed. Files are keyed by template id; an entry the project already has
 * is never touched.
 */
export const addStarterLocaleStrings = async (
  dir: string,
  locales: string[],
  starters: StarterId[]
): Promise<void> => {
  if (locales.length === 0) {
    return;
  }

  const localesDir = path.resolve(dir, "locales");
  await mkdir(localesDir, { recursive: true });

  await Promise.all(
    locales.map(async (locale) => {
      const file = path.resolve(localesDir, `${locale}.json`);
      const exists = existsSync(file);
      const current = exists ? await readJson(file) : {};
      const source = await readLocaleSource(locale);
      const missing = starters.filter((id) => !(id in current) && id in source);
      if (exists && missing.length === 0) {
        return;
      }
      const added = Object.fromEntries(missing.map((id) => [id, source[id]]));
      await writeFile(
        file,
        `${JSON.stringify({ ...current, ...added }, null, 2)}\n`
      );
    })
  );
};

const toStarterIds = (templates: string[]): StarterId[] =>
  templates.map((id) => {
    if (!isStarterId(id)) {
      throw new Error(`Template "${id}" not found at templates/${id}.tsx`);
    }
    return id;
  });

const copyReadme = async (dir: string, projectName: string): Promise<void> => {
  const readme = await readFile(
    path.resolve(resolveTemplateDir(), "README.md"),
    "utf-8"
  );
  await writeFile(
    path.resolve(dir, "README.md"),
    readme.replaceAll("{{projectName}}", projectName)
  );
};

export const scaffold = async (
  dir: string,
  options: ScaffoldOptions
): Promise<void> => {
  if (options.projectName.trim().length === 0) {
    throw new Error("Project name cannot be empty.");
  }

  const choices: ProjectChoices = {
    locales: options.locales,
    starters: toStarterIds(options.templates),
  };
  const version = getScaffoldVersion();

  if (!existsSync(dir)) {
    await mkdir(dir, { recursive: true });
  }

  await copyStaticAssets(dir);
  await generateConfig(dir, version, choices);
  await generatePackageJson(dir, options.projectName, version);
  await copyReadme(dir, options.projectName);
  await copyStarterFiles(dir, choices.starters, { force: true });
  await addStarterLocaleStrings(dir, choices.locales, choices.starters);
};
