import { afterAll, beforeAll, expect, it } from "bun:test";
import { mkdirSync, rmSync, writeFileSync } from "node:fs";
import path from "node:path";

import type { DevServer } from "../index.js";
import { createDevServer } from "../index.js";

const { join } = path;

const testProjectDir = join(import.meta.dir, "fixtures", "render-test-project");

const minimalTemplate = `
import { z } from "zod";

export const propsSchema = z.object({
  title: z.string().default("Hello"),
});

export default function TestCard({ title }: { title: string }) {
  return <div>{title}</div>;
}
`;

// These do real renders, and the Arabic ones download a font the first
// time. Bun's 5s default is too tight when every package tests at once.
const RENDER_TIMEOUT_MS = 30_000;

let server: DevServer;

beforeAll(() => {
  rmSync(testProjectDir, { force: true, recursive: true });
  mkdirSync(join(testProjectDir, "templates"), { recursive: true });
  mkdirSync(join(testProjectDir, "locales"), { recursive: true });
  writeFileSync(
    join(testProjectDir, "templates", "test-card.tsx"),
    minimalTemplate.trim()
  );
  writeFileSync(
    join(testProjectDir, "locales", "ar.json"),
    JSON.stringify({ "test-card": { title: "مرحبا" } })
  );
  writeFileSync(
    join(testProjectDir, "studio.config.ts"),
    [
      `import type { StudioConfig } from "@stdout-design/core";`,
      `const config: StudioConfig = {`,
      `  locales: ["ar"],`,
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
  server?.close();
  rmSync(testProjectDir, { force: true, recursive: true });
});

const cleanCache = async (): Promise<void> => {
  await server.app.request("/cache/clean", { method: "POST" });
};

it(
  "POST /render returns a PNG for a valid request",
  async () => {
    server = await createDevServer({ port: 0, rootDir: testProjectDir });
    await cleanCache();

    const res = await server.app.request("/render", {
      body: JSON.stringify({
        preset: "test",
        props: { title: "Hello" },
        templateId: "test-card",
      }),
      headers: { "Content-Type": "application/json" },
      method: "POST",
    });

    expect(res.status).toBe(200);
    expect(res.headers.get("Content-Type")).toBe("image/png");
    expect(res.headers.get("X-Cache")).toBe("miss");
  },
  RENDER_TIMEOUT_MS
);

it("POST /render returns 400 for empty body", async () => {
  const res = await server.app.request("/render", {
    body: JSON.stringify({}),
    headers: { "Content-Type": "application/json" },
    method: "POST",
  });

  expect(res.status).toBe(400);
});

it("POST /render returns 404 for unknown templateId", async () => {
  const res = await server.app.request("/render", {
    body: JSON.stringify({
      preset: "test",
      props: {},
      templateId: "does-not-exist",
    }),
    headers: { "Content-Type": "application/json" },
    method: "POST",
  });

  expect(res.status).toBe(404);
});

it("POST /render returns 400 for invalid props", async () => {
  const res = await server.app.request("/render", {
    body: JSON.stringify({
      preset: "test",
      props: { title: 42 },
      templateId: "test-card",
    }),
    headers: { "Content-Type": "application/json" },
    method: "POST",
  });

  expect(res.status).toBe(400);
});

it("POST /render returns 404 for unknown preset", async () => {
  const res = await server.app.request("/render", {
    body: JSON.stringify({
      preset: "does-not-exist",
      props: { title: "Hello" },
      templateId: "test-card",
    }),
    headers: { "Content-Type": "application/json" },
    method: "POST",
  });

  expect(res.status).toBe(404);
});

it(
  "POST /render caches and returns X-Cache: hit on second call",
  async () => {
    const body = JSON.stringify({
      preset: "test",
      props: { title: "Cache Test" },
      templateId: "test-card",
    });
    const headers = { "Content-Type": "application/json" };

    const first = await server.app.request("/render", {
      body,
      headers,
      method: "POST",
    });
    expect(first.headers.get("X-Cache")).toBe("miss");

    const second = await server.app.request("/render", {
      body,
      headers,
      method: "POST",
    });
    expect(second.status).toBe(200);
    expect(second.headers.get("X-Cache")).toBe("hit");
  },
  RENDER_TIMEOUT_MS
);

const renderBody = (title: string, locale?: string) => ({
  body: JSON.stringify({
    locale,
    preset: "test",
    props: { title },
    templateId: "test-card",
  }),
  headers: { "Content-Type": "application/json" },
  method: "POST" as const,
});

it(
  "POST /render produces different output with locale applied",
  async () => {
    const noLocale = await server.app.request("/render", renderBody("World"));
    const withLocale = await server.app.request(
      "/render",
      renderBody("World", "ar")
    );

    expect(noLocale.status).toBe(200);
    expect(withLocale.status).toBe(200);

    const noLocaleBytes = await noLocale.arrayBuffer();
    const withLocaleBytes = await withLocale.arrayBuffer();

    expect(noLocaleBytes.byteLength).toBeGreaterThan(0);
    expect(withLocaleBytes.byteLength).toBeGreaterThan(0);
    expect(
      Buffer.from(noLocaleBytes).equals(Buffer.from(withLocaleBytes))
    ).toBe(false);
  },
  RENDER_TIMEOUT_MS
);

const layeredBody = (overrides: Record<string, string>, autoDetected = false) =>
  JSON.stringify({
    autoDetected,
    locale: "ar",
    localeOverrides: overrides,
    preset: "test",
    props: { title: "World" },
    templateId: "test-card",
  });

it(
  "POST /render lays locale overrides over the locale file",
  async () => {
    await cleanCache();
    const headers = { "Content-Type": "application/json" };
    const fileOnly = await server.app.request(
      "/render",
      renderBody("World", "ar")
    );
    // An override equal to the file's string resolves to the same props.
    const sameAsFile = await server.app.request("/render", {
      body: layeredBody({ title: "مرحبا" }),
      headers,
      method: "POST",
    });
    const overridden = await server.app.request("/render", {
      body: layeredBody({ title: "أهلا وسهلا" }),
      headers,
      method: "POST",
    });

    expect(fileOnly.status).toBe(200);
    expect(sameAsFile.headers.get("X-Cache")).toBe("hit");
    expect(overridden.status).toBe(200);
    expect(
      Buffer.from(await overridden.arrayBuffer()).equals(
        Buffer.from(await fileOnly.arrayBuffer())
      )
    ).toBe(false);
  },
  RENDER_TIMEOUT_MS
);

it(
  "POST /render ignores locale overrides for an auto-detected locale",
  async () => {
    await cleanCache();
    const headers = { "Content-Type": "application/json" };
    const first = await server.app.request("/render", {
      body: layeredBody({}, true),
      headers,
      method: "POST",
    });
    const withOverride = await server.app.request("/render", {
      body: layeredBody({ title: "أهلا وسهلا" }, true),
      headers,
      method: "POST",
    });
    expect(first.status).toBe(200);
    expect(withOverride.headers.get("X-Cache")).toBe("hit");
  },
  RENDER_TIMEOUT_MS
);

it("GET /translations returns the locale file's strings by path", async () => {
  const res = await server.app.request("/translations/test-card/ar");
  expect(res.status).toBe(200);
  expect(await res.json()).toEqual({
    locale: "ar",
    strings: { title: "مرحبا" },
  });
});

it("GET /translations rejects an unconfigured locale and an unknown template", async () => {
  const badLocale = await server.app.request("/translations/test-card/..%2Fx");
  const unknown = await server.app.request("/translations/nope/ar");
  expect(badLocale.status).toBe(404);
  expect(unknown.status).toBe(404);
});

it(
  "POST /measure returns width and height for a valid request",
  async () => {
    const res = await server.app.request("/measure", {
      body: JSON.stringify({
        props: { title: "Measure Test" },
        templateId: "test-card",
      }),
      headers: { "Content-Type": "application/json" },
      method: "POST",
    });

    expect(res.status).toBe(200);

    const body = (await res.json()) as { width: number; height: number };
    expect(body).toHaveProperty("width");
    expect(body).toHaveProperty("height");
    expect(typeof body.width).toBe("number");
    expect(typeof body.height).toBe("number");
    expect(body.width).toBeGreaterThan(0);
    expect(body.height).toBeGreaterThan(0);
  },
  RENDER_TIMEOUT_MS
);

it("POST /measure returns 400 for empty body", async () => {
  const res = await server.app.request("/measure", {
    body: JSON.stringify({}),
    headers: { "Content-Type": "application/json" },
    method: "POST",
  });

  expect(res.status).toBe(400);
});

it("POST /measure returns 404 for unknown templateId", async () => {
  const res = await server.app.request("/measure", {
    body: JSON.stringify({
      props: {},
      templateId: "does-not-exist",
    }),
    headers: { "Content-Type": "application/json" },
    method: "POST",
  });

  expect(res.status).toBe(404);
});
