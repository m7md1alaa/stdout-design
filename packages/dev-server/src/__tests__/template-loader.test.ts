import { beforeAll, afterAll, it, expect } from "bun:test";
import { mkdirSync, writeFileSync } from "node:fs";
import { rmSync } from "node:fs";
import { join } from "node:path";

import { TemplateLoader } from "../template-loader.js";

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

beforeAll(() => {
  rmSync(testProjectDir, { force: true, recursive: true });
  mkdirSync(join(testProjectDir, "templates"), { recursive: true });
  writeFileSync(
    join(testProjectDir, "templates", "test-card.tsx"),
    minimalTemplate.trim()
  );
  writeFileSync(
    join(testProjectDir, "studio.config.ts"),
    [
      `import type { StudioConfig } from "@stdout-design/core";`,
      `const config: StudioConfig = {`,
      `  presets: [{ id: "test", width: 100, height: 100, platform: "test" }],`,
      `  templates: {`,
      `    "test-card": { componentPath: "./templates/test-card" },`,
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
  expect(card!.status).toBe("ok");
});
