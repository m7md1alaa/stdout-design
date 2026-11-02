import { beforeAll, afterAll, it, expect } from "bun:test";
import { mkdirSync, writeFileSync, rmSync } from "node:fs";
import path from "node:path";

import { TemplateLoader } from "../template-loader.js";

const { join } = path;

const testProjectDir = join(import.meta.dir, "fixtures", "test-project");

const minimalTemplate = `
import { z } from "zod";

export const propsSchema = z.object({
  title: z.string().default("Hello"),
});

export default function TestCard({ title }: { title: string }) {
  return <div>{title}</div>;
}
`;

const inspectorTemplate = `
import { defineTemplate, field } from "@stdout-design/core/template";

export default defineTemplate({
  inspector: [["Content", ["title"]]],
  render: (props) => <div>{props.title}</div>,
  schema: { title: field.text("Hello", { label: "Big title" }) },
});
`;

beforeAll(() => {
  rmSync(testProjectDir, { force: true, recursive: true });
  mkdirSync(join(testProjectDir, "templates"), { recursive: true });
  writeFileSync(
    join(testProjectDir, "templates", "test-card.tsx"),
    minimalTemplate.trim()
  );
  writeFileSync(
    join(testProjectDir, "templates", "layout-card.tsx"),
    inspectorTemplate.trim()
  );
  writeFileSync(
    join(testProjectDir, "studio.config.ts"),
    [
      `import type { StudioConfig } from "@stdout-design/core";`,
      `const config: StudioConfig = {`,
      `  presets: [{ id: "test", width: 100, height: 100, platform: "test" }],`,
      `  templates: {`,
      `    "test-card": { componentPath: "./templates/test-card" },`,
      `    "layout-card": { componentPath: "./templates/layout-card" },`,
      `  },`,
      `};`,
      `export default config;`,
    ].join("\n")
  );
});

afterAll(() => {
  rmSync(testProjectDir, { force: true, recursive: true });
});

it("loads a template with zod props schema successfully", async () => {
  const loader = new TemplateLoader(testProjectDir);
  await loader.start();

  const infos = await loader.loadAll();
  const card = infos.find((t) => t.id === "test-card");

  expect(card).toBeDefined();
  expect(card?.status).toBe("ok");
});

it("sends a template's inspector layout and field labels with its schema", async () => {
  const loader = new TemplateLoader(testProjectDir);
  await loader.start();

  const infos = await loader.loadAll();
  const layout = infos.find((t) => t.id === "layout-card");
  const legacy = infos.find((t) => t.id === "test-card");

  expect(layout?.status).toBe("ok");
  expect(layout?.inspector).toEqual([["Content", ["title"]]]);
  const properties = layout?.propsSchema.properties as Record<
    string,
    Record<string, unknown>
  >;
  expect(properties.title?.["x-field"]).toMatchObject({ label: "Big title" });
  expect(legacy?.inspector).toBeUndefined();
});
