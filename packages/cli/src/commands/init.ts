import { existsSync } from "node:fs";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

const getConfigTemplate =
  () => `import type { StudioConfig } from "@stdout-design/core";

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
  () => `import { defineSchema } from "@stdout-design/core";
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

export const init = async (projectDir: string | undefined): Promise<void> => {
  const dir = path.resolve(projectDir ?? process.cwd());

  if (!existsSync(dir)) {
    await mkdir(dir, { recursive: true });
  }

  const configPath = path.resolve(dir, "studio.config.ts");
  if (existsSync(configPath)) {
    console.log("studio.config.ts already exists — skipping scaffold.");
    return;
  }

  const templatesDir = path.resolve(dir, "templates");
  await mkdir(templatesDir, { recursive: true });

  const localesDir = path.resolve(dir, "locales");
  await mkdir(localesDir, { recursive: true });

  await writeFile(configPath, getConfigTemplate());

  await writeFile(
    path.resolve(templatesDir, "bento-feature.tsx"),
    getBentoFeatureTemplate()
  );

  await writeFile(
    path.resolve(localesDir, "en.json"),
    JSON.stringify({ title: "Featured App" }, null, 2)
  );

  await writeFile(
    path.resolve(localesDir, "ar.json"),
    JSON.stringify({ title: "التطبيق المميز" }, null, 2)
  );

  console.log(`Scaffolded studio project in ${dir}`);
  console.log("");
  console.log("Next steps:");
  console.log(`  cd ${projectDir || "."}`);
  console.log("  studio dev");
};
