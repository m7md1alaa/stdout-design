import { existsSync } from "node:fs";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

const getConfigTemplate =
  () => `import type { StudioConfig } from "@stdout/studio";

const config: StudioConfig = {
  defaultPreset: "instagram-square",
  locales: ["en", "ar"],
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

const getBentoFeatureTemplate =
  () => `import { defineSchema } from "@stdout/studio";
import { createElement, css, text } from "takumi-js";
import type { TakumiNode } from "takumi-js";

interface Props {
  title?: string;
  description?: string;
  accent?: string;
}

export const propsSchema = defineSchema({
  title: { type: "string", default: "Featured App", description: "Headline text" },
  description: { type: "string", default: "A beautiful description goes here.", description: "Subtitle text" },
  accent: { type: "string", default: "#6366f1", description: "Accent color" },
});

export default (props: Props): TakumiNode => {
  const { title = "Featured App", description = "", accent = "#6366f1" } = props;

  return createElement("div", {
    style: css({
      alignItems: "center",
      background: "#0a0a0b",
      borderRadius: 24,
      display: "flex",
      flexDirection: "column",
      height: "100%",
      justifyContent: "center",
      padding: 48,
      width: "100%",
    }),
    children: [
      createElement("div", {
        style: css({
          background: accent,
          borderRadius: 12,
          height: 64,
          marginBottom: 24,
          width: 64,
        }),
      }),
      createElement("h1", {
        style: css({
          color: "#ffffff",
          fontFamily: "Inter",
          fontSize: 42,
          fontWeight: 700,
          margin: 0,
          textAlign: "center",
        }),
        children: [text(title)],
      }),
      description ? createElement("p", {
        style: css({
          color: "#a1a1aa",
          fontFamily: "Inter",
          fontSize: 18,
          marginTop: 16,
          textAlign: "center",
        }),
        children: [text(description)],
      }) : null,
    ],
  });
};
`;

export interface ScaffoldOptions {
  install: boolean;
  locales: string[];
  templates: string[];
}

export const scaffold = async (
  dir: string,
  options: ScaffoldOptions
): Promise<void> => {
  if (!existsSync(dir)) {
    await mkdir(dir, { recursive: true });
  }

  const configPath = path.resolve(dir, "studio.config.ts");
  if (existsSync(configPath)) {
    console.log("studio.config.ts already exists — skipping scaffold.");
    return;
  }

  const hasTemplates = options.templates.length > 0;

  if (hasTemplates) {
    const templatesDir = path.resolve(dir, "templates");
    await mkdir(templatesDir, { recursive: true });
  }

  if (options.locales.length > 0) {
    const localesDir = path.resolve(dir, "locales");
    await mkdir(localesDir, { recursive: true });
  }

  await writeFile(configPath, getConfigTemplate());

  const writes: Promise<void>[] = [];

  for (const template of options.templates) {
    if (template === "bento-feature") {
      const templatesDir = path.resolve(dir, "templates");
      writes.push(
        writeFile(
          path.resolve(templatesDir, "bento-feature.tsx"),
          getBentoFeatureTemplate()
        )
      );
    }
  }

  for (const locale of options.locales) {
    const localesDir = path.resolve(dir, "locales");
    if (locale === "en") {
      writes.push(
        writeFile(
          path.resolve(localesDir, "en.json"),
          JSON.stringify({ title: "Featured App" }, null, 2)
        )
      );
    }
    if (locale === "ar") {
      writes.push(
        writeFile(
          path.resolve(localesDir, "ar.json"),
          JSON.stringify({ title: "التطبيق المميز" }, null, 2)
        )
      );
    }
  }

  await Promise.all(writes);

  console.log(`Scaffolded studio project in ${dir}`);
  console.log("");
  console.log("Next steps:");
  console.log(`  cd ${dir}`);
  console.log("  studio dev");

  if (options.install) {
    console.log("");
    console.log("Installing dependencies...");
    const { spawnSync } = await import("node:child_process");
    spawnSync("bun", ["install"], { cwd: dir, stdio: "inherit" });
  }
};

export const init = async (
  projectDir: string | undefined,
  options?: { yes?: boolean }
): Promise<void> => {
  const dir = path.resolve(projectDir ?? process.cwd());

  if (options?.yes) {
    await scaffold(dir, {
      install: true,
      locales: ["en", "ar"],
      templates: ["bento-feature"],
    });
    return;
  }

  const { intro, confirm, multiselect, outro, cancel, isCancel } =
    await import("@clack/prompts");

  intro("Studio Init");

  if (existsSync(path.resolve(dir, "studio.config.ts"))) {
    console.log("studio.config.ts already exists — skipping scaffold.");
    outro("Done");
    return;
  }

  const selectedTemplates = await multiselect({
    message: "Which templates would you like to scaffold?",
    options: [
      {
        hint: "Apple-style feature card",
        label: "Bento Feature",
        value: "bento-feature",
      },
    ],
  });

  if (isCancel(selectedTemplates)) {
    cancel("Cancelled.");
    process.exit(0);
  }

  const templates = selectedTemplates as string[];

  const selectedLocales = await multiselect({
    message: "Which locales would you like to include?",
    options: [
      { label: "English", value: "en" },
      { label: "Arabic", value: "ar" },
    ],
  });

  if (isCancel(selectedLocales)) {
    cancel("Cancelled.");
    process.exit(0);
  }

  const locales = selectedLocales as string[];

  const shouldInstall = await confirm({
    initialValue: true,
    message: "Install dependencies?",
  });

  if (isCancel(shouldInstall)) {
    cancel("Cancelled.");
    process.exit(0);
  }

  await scaffold(dir, {
    install: shouldInstall as boolean,
    locales,
    templates,
  });

  outro("Done");
};
