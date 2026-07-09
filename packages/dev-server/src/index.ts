import {
  compileTemplate,
  renderToPixels,
  measureTemplate,
  RenderCache,
} from "@stdout-design/core";
import { Hono } from "hono";
import { cors } from "hono/cors";
import { streamSSE } from "hono/streaming";
import { createElement } from "react";
import type React from "react";

import { errorHandler } from "./error-middleware.js";
import { FileWatcher } from "./file-watcher.js";
import { TemplateLoader } from "./template-loader.js";
import { renderRequestSchema, measureRequestSchema } from "./types";

/**
 * Merges locale translations into already-validated props. Loads the
 * locale JSON through TemplateLoader's vite-node pipeline (the same
 * leak-free, explicitly-invalidated module cache used for templates)
 * rather than a raw `import(...)?t=Date.now()`, which would reproduce the
 * exact unbounded module-registry leak that was fixed for template
 * loading.
 *
 * Unlike the original, failures are NOT swallowed: a missing or malformed
 * locale file is a real error the caller should see, not a silent
 * fallback to default-language props (silently shipping the wrong
 * language is a worse outcome than a clear 400).
 */
const applyLocale = async (
  templateLoader: TemplateLoader,
  rootDir: string,
  locale: string,
  props: Record<string, unknown>
): Promise<Record<string, unknown>> => {
  const localePath = `${rootDir}/locales/${locale}.json`;
  const translations = (await templateLoader.loadDataModule(
    localePath
  )) as Record<string, unknown>;

  const merged = { ...props };
  for (const [key, value] of Object.entries(translations)) {
    if (typeof value === "string" && typeof merged[key] === "string") {
      merged[key] = value;
    }
  }
  return merged;
};

export interface DevServerOptions {
  rootDir: string;
  port: number;
  cacheDir?: string;
  webUiDist?: string;
}

export const createDevServer = async (options: DevServerOptions) => {
  const { rootDir, port, cacheDir, webUiDist: _webUiDist } = options;

  const templateLoader = new TemplateLoader(rootDir);
  const fileWatcher = new FileWatcher(rootDir, templateLoader);
  const renderCache = new RenderCache({ cacheDir });

  await renderCache.init();
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
      return c.json(
        { error: "Invalid request body", issues: parsedBody.error.issues },
        400
      );
    }
    const { templateId, props, preset: presetId, locale } = parsedBody.data;

    const templateInfo = templateLoader.getTemplateInfo(templateId);
    if (!templateInfo) {
      return c.json({ error: `Template "${templateId}" not found` }, 404);
    }
    if (templateInfo.status === "error") {
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
      return c.json(
        { error: `Preset "${presetId ?? config.defaultPreset}" not found` },
        404
      );
    }

    const parsed = templateModule.propsSchema.safeParse(props);
    if (!parsed.success) {
      return c.json(
        { error: "Invalid props", issues: parsed.error.issues },
        400
      );
    }
    const validatedProps = parsed.data;

    let resolvedProps: Record<string, unknown>;
    if (locale) {
      try {
        resolvedProps = await applyLocale(
          templateLoader,
          rootDir,
          locale,
          validatedProps
        );
      } catch (error: unknown) {
        const message =
          error instanceof Error ? error.message : "Failed to load locale";
        return c.json({ error: `Locale "${locale}": ${message}` }, 400);
      }
    } else {
      resolvedProps = validatedProps;
    }

    const propsJSON = JSON.stringify(resolvedProps);

    const stageBKey = RenderCache.createStageBKey({
      height: preset.height,
      propsJSON,
      templateContentHash: templateInfo.contentHash,
      width: preset.width,
    });

    const cached = await renderCache.getStageB(stageBKey);
    if (cached) {
      return new Response(new Uint8Array(cached), {
        headers: {
          "Cache-Control": "public, max-age=31536000, immutable",
          "Content-Type": "image/png",
          "X-Cache": "hit",
        },
      });
    }

    const stageAKey = RenderCache.createStageAKey({
      propsJSON,
      templateContentHash: templateInfo.contentHash,
      templateId,
    });

    let compiled = renderCache.getStageA(stageAKey) as Awaited<
      ReturnType<typeof compileTemplate>
    > | null;

    if (!compiled) {
      const Component = templateModule.default as React.FunctionComponent<
        Record<string, unknown>
      >;
      const element = createElement(Component, resolvedProps);
      compiled = await compileTemplate(element);
      renderCache.setStageAWithContentHash(
        stageAKey,
        templateInfo.contentHash,
        compiled
      );
    }

    const output = await renderToPixels(compiled, {
      height: preset.height,
      width: preset.width,
    });

    await renderCache.setStageB(
      stageBKey,
      output.bytes,
      preset.width,
      preset.height
    );

    return new Response(new Uint8Array(output.bytes), {
      headers: {
        "Cache-Control": "public, max-age=31536000, immutable",
        "Content-Type": "image/png",
        "X-Cache": "miss",
      },
    });
  });

  // Measure endpoint — returns dimensions without full render
  app.post("/measure", async (c) => {
    const parsedBody = measureRequestSchema.safeParse(await c.req.json());
    if (!parsedBody.success) {
      return c.json(
        { error: "Invalid request body", issues: parsedBody.error.issues },
        400
      );
    }
    const { templateId, props } = parsedBody.data;

    const templateInfo = templateLoader.getTemplateInfo(templateId);
    if (!templateInfo) {
      return c.json({ error: `Template "${templateId}" not found` }, 404);
    }
    if (templateInfo.status === "error") {
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

    const parsed = templateModule.propsSchema.safeParse(props);
    if (!parsed.success) {
      return c.json(
        { error: "Invalid props", issues: parsed.error.issues },
        400
      );
    }
    const validatedProps = parsed.data;

    const propsJSON = JSON.stringify(validatedProps);

    const stageAKey = RenderCache.createStageAKey({
      propsJSON,
      templateContentHash: templateInfo.contentHash,
      templateId,
    });

    let compiled = renderCache.getStageA(stageAKey) as Awaited<
      ReturnType<typeof compileTemplate>
    > | null;

    if (!compiled) {
      const Component = templateModule.default as React.FunctionComponent<
        Record<string, unknown>
      >;
      const element = createElement(Component, validatedProps);
      compiled = await compileTemplate(element);
      renderCache.setStageAWithContentHash(
        stageAKey,
        templateInfo.contentHash,
        compiled
      );
    }

    const measured = await measureTemplate(compiled);

    return c.json({
      height: measured.height,
      width: measured.width,
    });
  });

  // Cache management
  app.get("/cache/stats", (c) => c.json(renderCache.stats()));

  app.post("/cache/clean", async (c) => {
    const result = await renderCache.clean();
    return c.json(result);
  });

  const close = async (): Promise<void> => {
    await fileWatcher.stop();
    await templateLoader.stop();
    renderCache.close();
  };

  return { app, close, fileWatcher, port, templateLoader };
};

export type DevServer = Awaited<ReturnType<typeof createDevServer>>;
