import { existsSync } from "node:fs";
import { cp, mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

import { getScaffoldVersion } from "./version.js";

export interface ScaffoldOptions {
  projectName: string;
  templates: string[];
  locales: string[];
  install: boolean;
  git: boolean;
}

export const getDefaults = () => ({
  defaultPreset: "instagram-square" as const,
  presets: [
    {
      height: 1080,
      id: "instagram-square",
      platform: "instagram",
      width: 1080,
    },
    { height: 1200, id: "x-card", platform: "x", width: 1200 },
  ],
  templates: {
    "bento-feature": {
      componentPath: "./templates/bento-feature",
      description: "Apple-style bento feature card.",
    },
  },
});

const getConfigTemplate = (version: string) =>
  `import type { StudioConfig } from "@stdout-design/cli";

const config: StudioConfig = {
  scaffoldVersion: "${version}",
  defaultPreset: "instagram-square",
  outDir: "./out",
  presets: [
    { height: 1080, id: "instagram-square", platform: "instagram", width: 1080 },
    { height: 1200, id: "x-card", platform: "x", width: 1200 },
  ],
  templates: {
    "bento-feature": {
      componentPath: "./templates/bento-feature",
      description: "Apple-style bento feature card.",
    },
  },
};

export default config;
`;

// oxlint-disable-next-line eslint/sort-keys
const getPkgJson = (name: string, version: string) => ({
  name,
  private: true,
  type: "module",
  scripts: {
    build: "studio build",
    dev: "studio dev",
    export: "studio export",
  },
  dependencies: {
    "@stdout-design/cli": `^${version}`,
    "@stdout-design/dev-server": `^${version}`,
    "@stdout-design/web-ui": `^${version}`,
    "@types/react": "^19.2.17",
    "react": "^19.2.7",
    "react-dom": "^19.2.7",
    "zod": "^4.4.3",
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

const generateConfig = async (dir: string, version: string): Promise<void> => {
  await writeFile(
    path.resolve(dir, "studio.config.ts"),
    getConfigTemplate(version)
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

const copyTemplateFiles = async (
  dir: string,
  templates: string[]
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
    templates.map((template) =>
      cp(
        path.resolve(srcTemplatesDir, `${template}.tsx`),
        path.resolve(dstTemplatesDir, `${template}.tsx`)
      )
    )
  );
};

const createLocaleFiles = async (
  dir: string,
  locales: string[]
): Promise<void> => {
  if (locales.length === 0) {
    return;
  }

  const localesDir = path.resolve(dir, "locales");
  await mkdir(localesDir, { recursive: true });

  const localeData: Record<string, Record<string, string>> = {
    ar: { title: "التطبيق المميز" },
    en: { title: "Featured App" },
  };

  await Promise.all(
    locales.map((locale) =>
      writeFile(
        path.resolve(localesDir, `${locale}.json`),
        JSON.stringify(localeData[locale] ?? { title: "Featured App" }, null, 2)
      )
    )
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
  await generateConfig(dir, version);
  await generatePackageJson(dir, options.projectName, version);
  await copyTemplateFiles(dir, options.templates);
  await createLocaleFiles(dir, options.locales);
};
