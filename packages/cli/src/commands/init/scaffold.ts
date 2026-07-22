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

const getPkgJson = (name: string, version: string) => ({
  dependencies: {
    "@stdout-design/cli": `^${version}`,
    "takumi-js": "^2.0.2",
  },
  name,
  private: true,
  scripts: {
    build: "studio build",
    dev: "studio dev",
    export: "studio export",
  },
  type: "module",
});

const templateDir = () =>
  path.resolve(import.meta.dirname, "../template");

const templatesDir = () =>
  path.resolve(import.meta.dirname, "../template/templates");

const copyStaticAssets = async (dir: string): Promise<void> => {
  const base = templateDir();

  await cp(
    path.resolve(base, "tsconfig.json"),
    path.resolve(dir, "tsconfig.json")
  );
  await cp(path.resolve(base, "gitignore"), path.resolve(dir, ".gitignore"));
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

  const srcTemplatesDir = templatesDir();

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
