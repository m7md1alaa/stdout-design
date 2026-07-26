import { afterAll, beforeAll, expect, it } from "bun:test";
import {
  mkdirSync,
  openSync,
  rmSync,
  writeFileSync,
  fsyncSync,
  closeSync,
} from "node:fs";
import path from "node:path";

import type { DevServer } from "../index.js";
import { createDevServer } from "../index.js";

const { join } = path;

const testProjectDir = join(
  import.meta.dir,
  "fixtures",
  "hot-reload-test-project"
);

const templateSource = [
  `import { z } from "zod";`,
  ``,
  `export const propsSchema = z.object({`,
  `  title: z.string().default("Hello"),`,
  `});`,
  ``,
  `export default function TestCard({ title }: { title: string }) {`,
  `  return <div style={{ width: 100, height: 100, background: "blue" }}>{title}</div>;`,
  `}`,
].join("\n");

const modifiedTemplateSource = [
  `import { z } from "zod";`,
  ``,
  `export const propsSchema = z.object({`,
  `  title: z.string().default("Changed"),`,
  `});`,
  ``,
  `export default function TestCard({ title }: { title: string }) {`,
  `  return <div style={{ width: 100, height: 100, background: "red" }}>{title}</div>;`,
  `}`,
].join("\n");

const configSource = [
  `import type { StudioConfig } from "@stdout-design/core";`,
  `const config: StudioConfig = {`,
  `  presets: [{ id: "test", width: 100, height: 100, platform: "test" }],`,
  `  templates: { "test-card": { componentPath: "./templates/test-card" } },`,
  `};`,
  `export default config;`,
].join("\n");

interface SSEEvent {
  event: string;
  data: string;
}

const consumeSSEBuffer = (buffer: string, events: SSEEvent[]): string => {
  const blocks = buffer.split("\n\n");
  const remaining = blocks.pop() ?? "";
  for (const block of blocks) {
    if (!block.trim()) {
      continue;
    }
    const lines = block.split("\n");
    const event: SSEEvent = { data: "", event: "message" };
    for (const line of lines) {
      if (line.startsWith("event: ")) {
        event.event = line.slice(7);
      } else if (line.startsWith("data: ")) {
        event.data = line.slice(6);
      }
    }
    if (event.event !== "message" || event.data) {
      events.push(event);
    }
  }
  return remaining;
};

const connectSSE = async (
  server: DevServer
): Promise<{ events: SSEEvent[]; close: () => void }> => {
  const res = await server.app.request("/events");
  const reader = res.body?.getReader();
  const events: SSEEvent[] = [];
  const decoder = new TextDecoder();
  let pumpBuffer = "";
  let closed = false;

  const close = (): void => {
    closed = true;
    reader?.cancel();
  };

  const pump = async (): Promise<void> => {
    if (closed || !reader) {
      return;
    }
    try {
      const { done, value } = await reader.read();
      if (done) {
        return;
      }
      pumpBuffer += decoder.decode(value, { stream: true });
      pumpBuffer = consumeSSEBuffer(pumpBuffer, events);
    } catch {
      return;
    }
    void pump();
  };

  void pump();

  return { close, events };
};

const writeAndWait = async (
  filePath: string,
  content: string
): Promise<void> => {
  writeFileSync(filePath, content);
  const fd = openSync(filePath, "r");
  fsyncSync(fd);
  closeSync(fd);
  await Bun.sleep(3000);
};

let server: DevServer;

beforeAll(async () => {
  rmSync(testProjectDir, { force: true, recursive: true });
  mkdirSync(join(testProjectDir, "templates"), { recursive: true });
  writeFileSync(
    join(testProjectDir, "templates", "test-card.tsx"),
    templateSource.trim()
  );
  writeFileSync(join(testProjectDir, "studio.config.ts"), configSource.trim());

  server = await createDevServer({ port: 0, rootDir: testProjectDir });
});

afterAll(async () => {
  await server?.close();
  rmSync(testProjectDir, { force: true, recursive: true });
});

it("sends SSE connected event on initial connection", async () => {
  const res = await server.app.request("/events");
  const reader = res.body?.getReader();
  const decoder = new TextDecoder();

  const first = await reader?.read();
  const text = decoder.decode(first?.value, { stream: true });
  reader?.cancel();

  expect(text).toContain("event: connected");
  expect(text).toContain("data: {}");
});

it("emits template event on template file change", async () => {
  const { events, close } = await connectSSE(server);

  await Bun.sleep(300);

  await writeAndWait(
    join(testProjectDir, "templates", "test-card.tsx"),
    modifiedTemplateSource
  );

  close();

  const reloadEvents = events.filter((e) => e.event === "reload");
  expect(reloadEvents.length).toBeGreaterThan(0);

  const templateEvent = reloadEvents.find(
    (e) => e.data.includes("template") && e.data.includes("test-card")
  );
  expect(templateEvent).toBeDefined();
  const data = JSON.parse(templateEvent?.data ?? "{}");
  expect(data.type).toBe("template");
  expect(data.templateId).toBe("test-card");
});

it("updates contentHash after template file change", async () => {
  const before = await server.app.request("/templates");
  const beforeBody = (await before.json()) as {
    id: string;
    contentHash: string;
  }[];
  const beforeHash = beforeBody.find((t) => t.id === "test-card")?.contentHash;
  expect(beforeHash).toBeDefined();

  await Bun.sleep(100);

  await writeAndWait(
    join(testProjectDir, "templates", "test-card.tsx"),
    templateSource
  );

  const after = await server.app.request("/templates");
  const afterBody = (await after.json()) as {
    id: string;
    contentHash: string;
  }[];
  const afterHash = afterBody.find((t) => t.id === "test-card")?.contentHash;
  expect(afterHash).toBeDefined();
  expect(afterHash).not.toBe(beforeHash);
});

it("render produces different output after hot-reload", async () => {
  const renderBody = {
    body: JSON.stringify({
      preset: "test",
      props: { title: "Hello" },
      templateId: "test-card",
    }),
    headers: { "Content-Type": "application/json" },
    method: "POST" as const,
  };

  const beforeRes = await server.app.request("/render", renderBody);
  const beforeBytes = await beforeRes.arrayBuffer();

  await writeAndWait(
    join(testProjectDir, "templates", "test-card.tsx"),
    modifiedTemplateSource
  );

  const afterRes = await server.app.request("/render", renderBody);
  const afterBytes = await afterRes.arrayBuffer();

  expect(beforeBytes.byteLength).toBeGreaterThan(0);
  expect(afterBytes.byteLength).toBeGreaterThan(0);
  expect(Buffer.from(beforeBytes).equals(Buffer.from(afterBytes))).toBe(false);
});

it("emits template-error event on broken template change", async () => {
  const brokenTemplate = [
    `import { z } from "zod";`,
    ``,
    `export const propsSchema = z.object({`,
    `  title: z.string().default("Hello"),`,
    `});`,
    ``,
    `export default function TestCard({ title }: { title: string }) {`,
    `  return <div>{title}</div>;`,
    ``,
  ].join("\n");

  const { events, close } = await connectSSE(server);

  await Bun.sleep(300);

  await writeAndWait(
    join(testProjectDir, "templates", "test-card.tsx"),
    brokenTemplate
  );

  close();

  const reloadEvents = events.filter((e) => e.event === "reload");
  const errorEvent = reloadEvents.find(
    (e) => e.data.includes("template-error") && e.data.includes("test-card")
  );
  expect(errorEvent).toBeDefined();

  const templatesRes = await server.app.request("/templates");
  const templates = (await templatesRes.json()) as {
    id: string;
    status: string;
  }[];
  const errored = templates.find((t) => t.id === "test-card");
  expect(errored?.status).toBe("error");
});

it("recovers from template error when file is fixed", async () => {
  await writeAndWait(
    join(testProjectDir, "templates", "test-card.tsx"),
    templateSource
  );

  const templatesRes = await server.app.request("/templates");
  const templates = (await templatesRes.json()) as {
    id: string;
    status: string;
    contentHash: string;
  }[];
  const recovered = templates.find((t) => t.id === "test-card");
  expect(recovered?.status).toBe("ok");
  expect(recovered?.contentHash.length).toBeGreaterThan(0);

  const renderRes = await server.app.request("/render", {
    body: JSON.stringify({
      preset: "test",
      props: { title: "Recovered" },
      templateId: "test-card",
    }),
    headers: { "Content-Type": "application/json" },
    method: "POST",
  });
  expect(renderRes.status).toBe(200);
  expect(renderRes.headers.get("Content-Type")).toBe("image/png");
});

it("emits full event on config file change", async () => {
  const newConfig = configSource.replace("width: 100", "width: 200");

  const { events, close } = await connectSSE(server);

  await Bun.sleep(300);

  await writeAndWait(join(testProjectDir, "studio.config.ts"), newConfig);

  close();

  const reloadEvents = events.filter((e) => e.event === "reload");
  const fullEvent = reloadEvents.find((e) => e.data.includes("full"));
  expect(fullEvent).toBeDefined();

  const presetsRes = await server.app.request("/presets");
  const presets = (await presetsRes.json()) as { width: number }[];
  expect(presets[0]?.width).toBe(200);
});

it("emits full event on unrecognized file in templates directory", async () => {
  const helperPath = join(testProjectDir, "templates", "helper.ts");
  const helperContent = "export const helper = (x: number) => x * 2;\n";

  const { events, close } = await connectSSE(server);

  await Bun.sleep(300);

  await writeAndWait(helperPath, helperContent);

  close();

  const reloadEvents = events.filter((e) => e.event === "reload");
  const fullEvent = reloadEvents.find((e) => e.data.includes("full"));
  expect(fullEvent).toBeDefined();
});
