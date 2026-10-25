import { existsSync } from "node:fs";
import { cp, mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

import type { StudioConfig } from "@stdout-design/core";

import { serializeConfig } from "./serialize-config.js";
import { getScaffoldVersion } from "./version.js";

export interface ScaffoldOptions {
  projectName: string;
  templates: string[];
  locales: string[];
  install: boolean;
  git: boolean;
}

type FontConfig = NonNullable<StudioConfig["fonts"]>[string][number];

/** The starter templates `studio init` offers, in prompt order. */
export const TEMPLATE_CATALOG = [
  {
    description:
      "Loud streetwear landing page with stickers and a stats strip.",
    hint: "Landing page hero",
    id: "launch-hero",
    label: "Launch Hero",
  },
  {
    description:
      "Budgeting-app bento grid: metric, receipt, chart, and gauge tiles.",
    hint: "Product bento grid",
    id: "bento-feature",
    label: "Bento Feature",
  },
  {
    description:
      "Retro print poster with a cassette, tape stripes, and a stamp.",
    hint: "Retro print poster",
    id: "retro-poster",
    label: "Retro Poster",
  },
  {
    description: "Editorial six-item grid with drawn specimens in each cell.",
    hint: "Editorial listicle",
    id: "trend-poster",
    label: "Trend Poster",
  },
] as const;

export const TEMPLATE_IDS: string[] = TEMPLATE_CATALOG.map((t) => t.id);

const LATIN_FONTS: FontConfig[] = [
  { family: "Archivo Black", source: "google", weights: [400] },
  { family: "Anton", source: "google", weights: [400] },
  { family: "Bricolage Grotesque", source: "google", weights: [400, 700] },
  { family: "Instrument Serif", source: "google", weights: [400] },
  { family: "Space Mono", source: "google", weights: [400, 700] },
];

// Arabic locales don't fall back to `default`, so they repeat the Latin
// faces (for brand names and numbers) and add Arabic ones the templates
// list second in each font stack.
const ARABIC_FONTS: FontConfig[] = [
  ...LATIN_FONTS,
  { family: "Lalezar", source: "google", weights: [400] },
  { family: "IBM Plex Sans Arabic", source: "google", weights: [400, 700] },
  { family: "Amiri", source: "google", weights: [400, 700] },
];

const getFonts = (locales: string[]): Record<string, FontConfig[]> => ({
  default: LATIN_FONTS,
  ...(locales.includes("ar") ? { ar: ARABIC_FONTS } : {}),
});

const getTemplateEntries = (ids: string[]) =>
  Object.fromEntries(
    TEMPLATE_CATALOG.filter((t) => ids.includes(t.id)).map((t) => [
      t.id,
      { componentPath: `./templates/${t.id}`, description: t.description },
    ])
  );

const PRESETS = [
  { height: 1080, id: "instagram-square", platform: "instagram", width: 1080 },
  { height: 675, id: "x-card", platform: "x", width: 1200 },
];

export const getDefaults = () => ({
  defaultPreset: "instagram-square" as const,
  fonts: getFonts(["ar"]),
  presets: PRESETS,
  templates: getTemplateEntries(TEMPLATE_IDS),
});

// Keys in the order a reader scans the generated file.
const getConfig = (
  version: string,
  templates: string[],
  locales: string[]
  // oxlint-disable-next-line eslint/sort-keys
): StudioConfig => ({
  scaffoldVersion: version,
  defaultPreset: "instagram-square",
  outDir: "./out",
  fonts: getFonts(locales),
  presets: PRESETS,
  templates: getTemplateEntries(templates),
});

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
  options: ScaffoldOptions
): Promise<void> => {
  await writeFile(
    path.resolve(dir, "studio.config.ts"),
    serializeConfig(getConfig(version, options.templates, options.locales))
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
 * Copies template files into `<dir>/templates`. With `overwrite: false`,
 * existing files are left alone, so `studio update` can add new starters
 * without clobbering a template the user has edited.
 */
export const copyTemplateFiles = async (
  dir: string,
  templates: string[],
  { overwrite }: { overwrite: boolean }
): Promise<void> => {
  if (templates.length === 0) {
    return;
  }

  const dstTemplatesDir = path.resolve(dir, "templates");
  await mkdir(dstTemplatesDir, { recursive: true });

  const srcTemplatesDir = resolveTemplatesDir();

  for (const template of templates) {
    const src = path.resolve(srcTemplatesDir, `${template}.tsx`);
    if (!existsSync(src)) {
      throw new Error(
        `Template "${template}" not found at templates/${template}.tsx`
      );
    }
  }

  await Promise.all(
    templates
      .filter(
        (template) =>
          overwrite ||
          !existsSync(path.resolve(dstTemplatesDir, `${template}.tsx`))
      )
      .map((template) =>
        cp(
          path.resolve(srcTemplatesDir, `${template}.tsx`),
          path.resolve(dstTemplatesDir, `${template}.tsx`)
        )
      )
  );
};

const readLocaleSource = async (
  locale: string
): Promise<Record<string, Record<string, unknown>>> => {
  const file = path.resolve(resolveTemplateDir(), "locales", `${locale}.json`);
  // Locales without a translation start from the English copy.
  const fallback = path.resolve(resolveTemplateDir(), "locales", "en.json");
  return JSON.parse(
    await readFile(existsSync(file) ? file : fallback, "utf-8")
  ) as Record<string, Record<string, unknown>>;
};

const createLocaleFiles = async (
  dir: string,
  locales: string[],
  templates: string[]
): Promise<void> => {
  if (locales.length === 0) {
    return;
  }

  const localesDir = path.resolve(dir, "locales");
  await mkdir(localesDir, { recursive: true });

  // Locale files are keyed by template id; each entry overrides that
  // template's string props when rendering with `--locale <code>`.
  await Promise.all(
    locales.map(async (locale) => {
      const source = await readLocaleSource(locale);
      const picked = Object.fromEntries(
        templates.filter((id) => id in source).map((id) => [id, source[id]])
      );
      await writeFile(
        path.resolve(localesDir, `${locale}.json`),
        `${JSON.stringify(picked, null, 2)}\n`
      );
    })
  );
};

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

  const version = getScaffoldVersion();

  if (!existsSync(dir)) {
    await mkdir(dir, { recursive: true });
  }

  await copyStaticAssets(dir);
  await generateConfig(dir, version, options);
  await generatePackageJson(dir, options.projectName, version);
  await copyReadme(dir, options.projectName);
  await copyTemplateFiles(dir, options.templates, { overwrite: true });
  await createLocaleFiles(dir, options.locales, options.templates);
};
