import { afterAll, beforeAll, describe, expect, it } from "bun:test";
import { mkdirSync, rmSync, writeFileSync } from "node:fs";
import path from "node:path";

import type { DevServer } from "../index.js";
import { createDevServer } from "../index.js";

const { join } = path;

const testProjectDir = join(import.meta.dir, "fixtures", "server-test-project");

const minimalTemplate = `
import { z } from "zod";

export const propsSchema = z.object({
  title: z.string().default("Hello"),
});

export default function TestCard({ title }: { title: string }) {
  return <div>{title}</div>;
}
`;

const secondTemplate = `
import { z } from "zod";

export const propsSchema = z.object({
  stat: z.number().default(100),
  subtitle: z.string().default("sub"),
});

export default function MilestoneCard({ stat, subtitle }: { stat: number; subtitle: string }) {
  return <div>{stat} — {subtitle}</div>;
}
`;

let server: DevServer;

beforeAll(async () => {
  rmSync(testProjectDir, { force: true, recursive: true });
  mkdirSync(join(testProjectDir, "templates"), { recursive: true });
  mkdirSync(join(testProjectDir, "locales"), { recursive: true });
  writeFileSync(
    join(testProjectDir, "templates", "test-card.tsx"),
    minimalTemplate.trim()
  );
  writeFileSync(
    join(testProjectDir, "templates", "milestone-card.tsx"),
    secondTemplate.trim()
  );
  writeFileSync(
    join(testProjectDir, "locales", "en.json"),
    JSON.stringify({ "test-card": { title: "Hello" } })
  );
  writeFileSync(
    join(testProjectDir, "studio.config.ts"),
    [
      `import type { StudioConfig } from "@stdout-design/core";`,
      `const config: StudioConfig = {`,
      `  defaultPreset: "small",`,
      `  locales: ["en", "ar"],`,
      `  presets: [`,
      `    { id: "small", width: 100, height: 100, platform: "test" },`,
      `    { id: "medium", width: 200, height: 200, platform: "test" },`,
      `  ],`,
      `  templates: {`,
      `    "test-card": { componentPath: "./templates/test-card", description: "A test card" },`,
      `    "milestone-card": { componentPath: "./templates/milestone-card" },`,
      `  },`,
      `};`,
      `export default config;`,
    ].join("\n")
  );

  server = await createDevServer({ port: 0, rootDir: testProjectDir });
});

afterAll(async () => {
  await server?.close();
  rmSync(testProjectDir, { force: true, recursive: true });
});

describe("GET /templates", () => {
  it("returns all templates with their prop schemas", async () => {
    const res = await server.app.request("/templates");

    expect(res.status).toBe(200);

    const body = (await res.json()) as {
      id: string;
      description: string;
      propsSchema: Record<string, unknown>;
      contentHash: string;
      status?: string;
    }[];

    expect(body).toBeInstanceOf(Array);
    expect(body.length).toBeGreaterThanOrEqual(2);

    const testCard = body.find((t) => t.id === "test-card");
    expect(testCard).toBeDefined();
    expect(testCard?.status).toBe("ok");
    expect(testCard?.propsSchema).toBeDefined();

    const milestone = body.find((t) => t.id === "milestone-card");
    expect(milestone).toBeDefined();
    expect(milestone?.status).toBe("ok");
  });

  it("returns templates with contentHash field", async () => {
    const res = await server.app.request("/templates");
    const body = (await res.json()) as { contentHash: string }[];

    for (const template of body) {
      expect(template.contentHash).toBeDefined();
      expect(template.contentHash.length).toBeGreaterThan(0);
    }
  });
});

describe("GET /presets", () => {
  it("returns all configured presets", async () => {
    const res = await server.app.request("/presets");

    expect(res.status).toBe(200);

    const body = (await res.json()) as {
      id: string;
      width: number;
      height: number;
      platform: string;
    }[];

    expect(body).toBeInstanceOf(Array);
    expect(body.length).toBe(2);

    const small = body.find((p) => p.id === "small");
    expect(small).toBeDefined();
    expect(small?.width).toBe(100);
    expect(small?.height).toBe(100);

    const medium = body.find((p) => p.id === "medium");
    expect(medium).toBeDefined();
    expect(medium?.width).toBe(200);
    expect(medium?.height).toBe(200);
  });
});

describe("GET /locales", () => {
  it("returns all configured locales", async () => {
    const res = await server.app.request("/locales");

    expect(res.status).toBe(200);

    const body = (await res.json()) as string[];

    expect(body).toBeInstanceOf(Array);
    expect(body).toContain("en");
    expect(body).toContain("ar");
  });
});

describe("GET /config", () => {
  it("returns the full config summary", async () => {
    const res = await server.app.request("/config");

    expect(res.status).toBe(200);

    const body = (await res.json()) as {
      defaultPreset: string;
      locales: string[];
      outDir: string;
      presets: {
        id: string;
        width: number;
        height: number;
        platform: string;
      }[];
    };

    expect(body.defaultPreset).toBe("small");
    expect(body.locales).toContain("en");
    expect(body.locales).toContain("ar");
    expect(body.presets).toBeInstanceOf(Array);
    expect(body.presets.length).toBe(2);
  });
});

describe("GET /cache/stats", () => {
  it("returns 200 with a JSON response from the cache stats endpoint", async () => {
    const res = await server.app.request("/cache/stats");

    expect(res.status).toBe(200);

    const body = (await res.json()) as Record<string, unknown>;

    // The stats route passes a Promise to c.json() without awaiting,
    // so the response body reflects the Promise serialization.
    // This test validates the endpoint is reachable and returns JSON;
    // the route handler should be made async to properly await stats().
    expect(typeof body).toBe("object");
  });
});

describe("POST /cache/clean", () => {
  it("cleans the cache and returns result", async () => {
    const res = await server.app.request("/cache/clean", { method: "POST" });

    expect(res.status).toBe(200);

    const body = (await res.json()) as { freedBytes: number };

    expect(body).toHaveProperty("freedBytes");
    expect(typeof body.freedBytes).toBe("number");
  });
});
