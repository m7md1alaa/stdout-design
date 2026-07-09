import { beforeAll, afterAll, it, expect } from "bun:test";
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";

import { createDevServer } from "../index.js";

const { join } = path;

let server: Awaited<ReturnType<typeof createDevServer>>;
let rootDir: string;

beforeAll(async () => {
  rootDir = mkdtempSync(join(tmpdir(), "stdout-test-"));
  mkdirSync(join(rootDir, "templates"));
  writeFileSync(
    join(rootDir, "studio.config.ts"),
    [
      `import type { StudioConfig } from "@stdout-design/core";`,
      `const config: StudioConfig = {`,
      `  presets: [{ id: "test", width: 100, height: 100, platform: "test" }],`,
      `  templates: {},`,
      `};`,
      `export default config;`,
    ].join("\n")
  );

  server = await createDevServer({ port: 0, rootDir });
});

afterAll(async () => {
  await server.close();
  rmSync(rootDir, { force: true, recursive: true });
});

it("GET /events returns text/event-stream content type", async () => {
  const res = await server.app.request("/events");
  expect(res.headers.get("Content-Type")).toBe("text/event-stream");
});
