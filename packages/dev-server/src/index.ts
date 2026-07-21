import path from "node:path";

import {
  logWarn,
  openCache,
  orchestrateRender,
  orchestrateMeasure,
  PropValidationError,
  resolveProjectPaths,
} from "@stdout-design/core";
import { Hono } from "hono";
import { cors } from "hono/cors";
import { logger } from "hono/logger";
import { streamSSE } from "hono/streaming";
import type { ComponentType } from "react";

import { errorHandler } from "./error-middleware.js";
import { FileWatcher } from "./file-watcher.js";
import { TemplateLoader } from "./template-loader.js";
import { renderRequestSchema, measureRequestSchema } from "./types";

const loadLocaleDataForLoader =
  (templateLoader: TemplateLoader, rootDir: string) =>
  async (locale: string): Promise<Record<string, unknown>> => {
    const localePath = path.resolve(
      resolveProjectPaths(rootDir).localesDir,
      `${locale}.json`
    );
    const translations = (await templateLoader.loadDataModule(
      localePath
    )) as Record<string, unknown>;
    return translations;
  };

export interface DevServerOptions {
  rootDir: string;
  port: number;
  cacheDir?: string;
  webUiDist?: string;
}

const MIME_TYPES: Record<string, string> = {
  ".css": "text/css",
  ".html": "text/html",
  ".ico": "image/x-icon",
  ".js": "application/javascript",
  ".json": "application/json",
  ".mjs": "application/javascript",
  ".png": "image/png",
  ".svg": "image/svg+xml",
  ".wasm": "application/wasm",
  ".webmanifest": "application/manifest+json",
  ".woff2": "font/woff2",
};

const serveStaticDir = (app: Hono, dir: string, basePath = "/"): void => {
  app.get(`${basePath}*`, async (c) => {
    const url = new URL(c.req.url);
    let filePath = path.join(dir, url.pathname);

    if (!path.extname(filePath)) {
      filePath = path.join(filePath, "index.html");
    }

    const file = Bun.file(filePath);
    const exists = await file.exists();
    if (!exists) {
      const indexFile = Bun.file(path.join(dir, "index.html"));
      const indexExists = await indexFile.exists();
      if (!indexExists) {
        return c.notFound();
      }
      return new Response(indexFile, {
        headers: { "Content-Type": "text/html" },
      });
    }

    const ext = path.extname(filePath);
    const contentType = MIME_TYPES[ext] ?? "application/octet-stream";
    return new Response(file, {
      headers: { "Content-Type": contentType },
    });
  });
};

export const createDevServer = async (options: DevServerOptions) => {
  const { rootDir, port, cacheDir, webUiDist } = options;

  const templateLoader = new TemplateLoader(rootDir);
  const fileWatcher = new FileWatcher(rootDir, templateLoader);
  const renderCache = await openCache(rootDir, { cacheDir });
  // start() boots the vite-node SSR pipeline that loadAll/loadDataModule
  // depend on -- must happen before any template or locale file is loaded.
  await templateLoader.start();
  await templateLoader.loadAll();

  fileWatcher.start();

  // Reload notifications from the file watcher are the only thing that
  // pushes to clients (see SSE endpoint below); the watcher already calls
  // templateLoader.reloadTemplate/reloadAll internally on change, so there
  // is nothing further to wire up here beyond relaying its events.

  const app = new Hono();
  app.onError(errorHandler);

  app.use(
    "*",
    cors({
      credentials: true,
      origin: ["http://localhost:5173", `http://localhost:${port}`],
    })
  );

  app.use("*", logger());

  // SSE endpoint for file-watch reload notifications
  app.get("/events", (c) =>
    streamSSE(c, async (s) => {
      const unsubscribe = fileWatcher.onEvent((event) => {
        s.writeSSE({ data: JSON.stringify(event), event: "reload" });
      });

      s.onAbort(unsubscribe);
      await s.writeSSE({ data: "{}", event: "connected" });

      while (!c.req.raw.signal.aborted) {
        // oxlint-disable-next-line no-await-in-loop
        await s.write(": keepalive\n\n");
        // oxlint-disable-next-line no-await-in-loop
        await s.sleep(15_000);
      }
    })
  );

  // List all templates with their prop schemas (and per-template error state)
  app.get("/templates", (c) => c.json(templateLoader.getAllTemplateInfo()));

  // List all presets
  app.get("/presets", async (c) => {
    const config = await templateLoader.getConfig();
    return c.json(config.presets);
  });

  // List all locales
  app.get("/locales", async (c) => {
    const config = await templateLoader.getConfig();
    return c.json(config.locales ?? []);
  });

  // Get current config
  app.get("/config", async (c) => {
    const config = await templateLoader.getConfig();
    return c.json({
      defaultPreset: config.defaultPreset,
      locales: config.locales,
      outDir: config.outDir,
      presets: config.presets,
    });
  });

  // Render endpoint — returns raw PNG bytes
  app.post("/render", async (c) => {
    const parsedBody = renderRequestSchema.safeParse(await c.req.json());
    if (!parsedBody.success) {
      logWarn("Invalid render request body", {
        issues: parsedBody.error.issues,
      });
      return c.json(
        { error: "Invalid request body", issues: parsedBody.error.issues },
        400
      );
    }
    const { templateId, props, preset: presetId, locale } = parsedBody.data;

    const templateInfo = templateLoader.getTemplateInfo(templateId);
    if (!templateInfo) {
      logWarn("Render template not found", { templateId });
      return c.json({ error: `Template "${templateId}" not found` }, 404);
    }
    if (templateInfo.status === "error") {
      logWarn("Render template load error", {
        errorMessage: templateInfo.errorMessage,
        templateId,
      });
      return c.json(
        {
          error: `Template "${templateId}" failed to load: ${templateInfo.errorMessage}`,
        },
        422
      );
    }

    const templateModule = templateLoader.getTemplateModule(templateId);
    if (!templateModule) {
      return c.json(
        { error: `Template "${templateId}" module unavailable` },
        500
      );
    }

    const config = await templateLoader.getConfig();
    const preset = presetId
      ? config.presets.find((p) => p.id === presetId)
      : config.presets.find((p) => p.id === config.defaultPreset);

    if (!preset) {
      logWarn("Render preset not found", {
        presetId: presetId ?? config.defaultPreset,
      });
      return c.json(
        { error: `Preset "${presetId ?? config.defaultPreset}" not found` },
        404
      );
    }

    try {
      const result = await orchestrateRender({
        cache: renderCache,
        component: templateModule.default as ComponentType<
          Record<string, unknown>
        >,
        height: preset.height,
        loadLocaleData: locale
          ? loadLocaleDataForLoader(templateLoader, rootDir)
          : undefined,
        locale,
        props: props as Record<string, unknown>,
        propsSchema: templateModule.propsSchema,
        templateContentHash: templateInfo.contentHash,
        templateId,
        width: preset.width,
      });

      return new Response(new Uint8Array(result.bytes), {
        headers: {
          "Cache-Control": "public, max-age=31536000, immutable",
          "Content-Type": "image/png",
          "X-Cache": result.cacheHit ? "hit" : "miss",
        },
      });
    } catch (error: unknown) {
      if (error instanceof PropValidationError) {
        return c.json({ error: "Invalid props", issues: error.issues }, 400);
      }
      const message = error instanceof Error ? error.message : "Render failed";
      logWarn("Render failed", { message, templateId });
      return c.json({ error: message }, 400);
    }
  });

  // Measure endpoint — returns dimensions without full render
  app.post("/measure", async (c) => {
    const parsedBody = measureRequestSchema.safeParse(await c.req.json());
    if (!parsedBody.success) {
      logWarn("Invalid measure request body", {
        issues: parsedBody.error.issues,
      });
      return c.json(
        { error: "Invalid request body", issues: parsedBody.error.issues },
        400
      );
    }
    const { templateId, props, locale } = parsedBody.data;

    const templateInfo = templateLoader.getTemplateInfo(templateId);
    if (!templateInfo) {
      logWarn("Measure template not found", { templateId });
      return c.json({ error: `Template "${templateId}" not found` }, 404);
    }
    if (templateInfo.status === "error") {
      logWarn("Measure template load error", {
        errorMessage: templateInfo.errorMessage,
        templateId,
      });
      return c.json(
        {
          error: `Template "${templateId}" failed to load: ${templateInfo.errorMessage}`,
        },
        422
      );
    }

    const templateModule = templateLoader.getTemplateModule(templateId);
    if (!templateModule) {
      return c.json(
        { error: `Template "${templateId}" module unavailable` },
        500
      );
    }

    try {
      const result = await orchestrateMeasure({
        cache: renderCache,
        component: templateModule.default as ComponentType<
          Record<string, unknown>
        >,
        loadLocaleData: locale
          ? loadLocaleDataForLoader(templateLoader, rootDir)
          : undefined,
        locale,
        props: props as Record<string, unknown>,
        propsSchema: templateModule.propsSchema,
        templateContentHash: templateInfo.contentHash,
        templateId,
      });

      return c.json({
        height: result.height,
        width: result.width,
      });
    } catch (error: unknown) {
      if (error instanceof PropValidationError) {
        return c.json({ error: "Invalid props", issues: error.issues }, 400);
      }
      const message = error instanceof Error ? error.message : "Measure failed";
      logWarn("Measure failed", { message, templateId });
      return c.json({ error: message }, 400);
    }
  });

  // Cache management
  app.get("/cache/stats", (c) => c.json(renderCache.stats()));

  app.post("/cache/clean", async (c) => {
    const result = await renderCache.clean();
    return c.json(result);
  });

  // Serve the web-ui static files if a dist path is provided
  if (webUiDist) {
    serveStaticDir(app, webUiDist);
  }

  const close = async (): Promise<void> => {
    await fileWatcher.stop();
    await templateLoader.stop();
    renderCache.close();
  };

  return { app, close, fileWatcher, port, templateLoader };
};

export type DevServer = Awaited<ReturnType<typeof createDevServer>>;

export const startStandaloneServer = async (
  options: DevServerOptions
): Promise<{ close: () => Promise<void> }> => {
  const server = await createDevServer(options);

  Bun.serve({
    fetch: server.app.fetch,
    port: server.port,
  });

  console.log(`Studio dev server running on http://localhost:${server.port}`);

  const shutdown = async () => {
    console.log("\nShutting down...");
    await server.close();
    process.exit(0);
  };

  process.on("SIGINT", shutdown);
  process.on("SIGTERM", shutdown);

  return {
    close: async () => {
      await server.close();
    },
  };
};
