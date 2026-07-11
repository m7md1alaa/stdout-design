import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { pathToFileURL } from "node:url";

import { studioConfigSchema, zodToJsonSchemaShape } from "@stdout-design/core";
import type { StudioConfig, TemplateModule } from "@stdout-design/core";
import react from "@vitejs/plugin-react";
import { createServer } from "vite";
import { ViteNodeRunner } from "vite-node/client";
import { ViteNodeServer } from "vite-node/server";
import { installSourcemapsSupport } from "vite-node/source-map";

import { TemplateConfigError } from "./template-config-error.js";
import {
  summarizeZodIssues,
  validateTemplateModule,
} from "./template-helpers.js";

const { resolve } = path;

type TemplateLoadState =
  | { status: "ok"; module: TemplateModule }
  | { status: "error"; error: Error };

export interface TemplateInfo {
  id: string;
  description: string;
  contentHash: string;
  status: "ok" | "error";
  /** JSON-Schema-shaped representation of the zod props schema. Empty object if errored. */
  propsSchema: Record<string, unknown>;
  /** Present only when status is "error". */
  errorMessage?: string;
}

interface RegisteredTemplate {
  id: string;
  modulePath: string;
  description: string;
  contentHash: string;
  state: TemplateLoadState | null;
}

export class TemplateLoader {
  private readonly rootDir: string;
  private readonly configPath: string;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private viteServer: any = null;
  private runner: ViteNodeRunner | null = null;

  private config: StudioConfig | null = null;
  private templates = new Map<string, RegisteredTemplate>();
  private started = false;

  constructor(rootDir: string) {
    this.rootDir = rootDir;
    this.configPath = resolve(rootDir, "studio.config.ts");
  }

  /**
   * Boots the Vite SSR pipeline. Must be called once before load/reload
   * methods are used. Cheap to call once per `studio dev` session; not
   * meant to be re-created per reload (that defeats the point of the
   * module cache).
   */
  async start(): Promise<void> {
    if (this.started) {
      return;
    }

    this.viteServer = await createServer({
      mode: "development",
      optimizeDeps: { noDiscovery: true },
      plugins: [react()],
      root: this.rootDir,
      server: { hmr: false, middlewareMode: true },
      ssr: { optimizeDeps: { include: ["zod"] } },
    });

    // Vite's own dependency-graph invalidation (configFileDependencies,
    // moduleGraph) is what we lean on for "did this file or anything it
    // imports change" -- we don't reimplement that ourselves.
    const nodeServer = new ViteNodeServer(this.viteServer);
    installSourcemapsSupport({
      getSourceMap: (source) => nodeServer.getSourceMap(source),
    });

    this.runner = new ViteNodeRunner({
      fetchModule: (id) => nodeServer.fetchModule(id),
      resolveId: (id, importer) => nodeServer.resolveId(id, importer),
      root: this.viteServer.config.root,
    });

    this.started = true;
  }

  async stop(): Promise<void> {
    await this.viteServer?.close();
    this.started = false;
    this.viteServer = null;
    this.runner = null;
  }

  // ---------------------------------------------------------------------
  // Config
  // ---------------------------------------------------------------------

  async loadConfig(): Promise<StudioConfig> {
    this.assertStarted();

    const raw = await this.importFresh(this.configPath);
    const candidate = (raw as { default?: unknown }).default ?? raw;

    const parsed = studioConfigSchema.safeParse(candidate);
    if (!parsed.success) {
      throw new TemplateConfigError(
        `studio.config.ts is invalid: ${summarizeZodIssues(parsed.error.issues)}`,
        parsed.error.issues
      );
    }

    this.config = parsed.data;
    return this.config;
  }

  // oxlint-disable-next-line eslint/require-await
  async getConfig(): Promise<StudioConfig> {
    if (!this.config) {
      return this.loadConfig();
    }
    return this.config;
  }

  // ---------------------------------------------------------------------
  // Templates
  // ---------------------------------------------------------------------

  /**
   * Loads the config and registers + loads every template declared in it.
   * A failure in one template does not prevent the others from loading.
   */
  async loadAll(): Promise<TemplateInfo[]> {
    const config = await this.loadConfig();
    this.templates.clear();

    for (const [id, entry] of Object.entries(config.templates)) {
      const modulePath = resolve(this.rootDir, `${entry.componentPath}.tsx`);
      this.templates.set(id, {
        contentHash: "",
        description: entry.description ?? "",
        id,
        modulePath,
        state: null,
      });
    }

    await Promise.all([...this.templates.keys()].map((id) => this.loadOne(id)));

    return this.getAllTemplateInfo();
  }

  /**
   * (Re)loads a single template by id. Used by the file watcher when one
   * template file changes -- does not touch any other template's state.
   */
  async reloadTemplate(id: string): Promise<TemplateInfo | null> {
    const entry = this.templates.get(id);
    if (!entry) {
      return null;
    }

    await this.loadOne(id);
    return TemplateLoader.toTemplateInfo(entry);
  }

  /**
   * Full reload: config + every template. Used when studio.config.ts
   * itself changes, since template registration may have changed.
   */
  // oxlint-disable-next-line eslint/require-await
  async reloadAll(): Promise<TemplateInfo[]> {
    this.invalidateModule(this.configPath);
    return this.loadAll();
  }

  getTemplateModule(id: string): TemplateModule | null {
    const entry = this.templates.get(id);
    if (!entry || !entry.state || entry.state.status === "error") {
      return null;
    }
    return entry.state.module;
  }

  getTemplateInfo(id: string): TemplateInfo | null {
    const entry = this.templates.get(id);
    return entry ? TemplateLoader.toTemplateInfo(entry) : null;
  }

  getAllTemplateInfo(): TemplateInfo[] {
    return [...this.templates.values()].map((entry) =>
      TemplateLoader.toTemplateInfo(entry)
    );
  }

  // ---------------------------------------------------------------------
  // Internals
  // ---------------------------------------------------------------------

  /**
   * Loads any file (not just templates) through the same vite-node SSR
   * pipeline used for templates -- e.g. locale JSON files. Reuses the
   * already-running Vite server rather than spinning up a second one, and
   * gets the same leak-free cache invalidation as template loading.
   *
   * Returns the module's default export if present, otherwise the module
   * namespace itself (matches how `import x.json` typically shapes up).
   */
  async loadDataModule(filePath: string): Promise<unknown> {
    const raw = await this.importFresh(filePath);
    return (raw as { default?: unknown }).default ?? raw;
  }

  /** Forces a fresh read on the next loadDataModule/template load for this path. */
  invalidateDataModule(filePath: string): void {
    this.invalidateModule(filePath);
  }

  private async loadOne(id: string): Promise<void> {
    const entry = this.templates.get(id);
    if (!entry) {
      return;
    }

    try {
      const content = await readFile(entry.modulePath, "utf-8");
      entry.contentHash = createHash("sha256")
        .update(content)
        .digest("hex")
        .slice(0, 16);

      this.invalidateModule(entry.modulePath);
      const mod = await this.importFresh(entry.modulePath);

      const templateModule = validateTemplateModule(mod, id);
      entry.state = { module: templateModule, status: "ok" };
    } catch (error) {
      console.error(
        `[template-loader] Failed to load template "${id}":`,
        error
      );
      entry.state = {
        error: error instanceof Error ? error : new Error(String(error)),
        status: "error",
      };
    }
  }

  private importFresh(modulePath: string): Promise<unknown> {
    if (!this.runner) {
      throw new Error(
        "TemplateLoader.start() must be called before loading modules."
      );
    }
    return this.runner.executeFile(modulePath);
  }

  private invalidateModule(modulePath: string): void {
    if (!this.runner) {
      return;
    }
    const id = pathToFileURL(modulePath).pathname;
    // ViteNodeRunner's moduleCache is the explicit cache we control --
    // deleting an entry here, plus its known importers, is what replaces
    // the old `?t=Date.now()` cache-busting hack with something that
    // doesn't leak.
    this.runner.moduleCache.deleteByModuleId(id);
    this.runner.moduleCache.delete(modulePath);
  }

  private static toTemplateInfo(entry: RegisteredTemplate): TemplateInfo {
    if (!entry.state) {
      return {
        contentHash: entry.contentHash,
        description: entry.description,
        errorMessage: "Not loaded yet",
        id: entry.id,
        propsSchema: {},
        status: "error",
      };
    }

    if (entry.state.status === "error") {
      return {
        contentHash: entry.contentHash,
        description: entry.description,
        errorMessage: entry.state.error.message,
        id: entry.id,
        propsSchema: {},
        status: "error",
      };
    }

    return {
      contentHash: entry.contentHash,
      description: entry.description,
      id: entry.id,
      propsSchema: zodToJsonSchemaShape(entry.state.module.propsSchema),
      status: "ok",
    };
  }

  private assertStarted(): void {
    if (!this.started || !this.runner) {
      throw new Error("TemplateLoader.start() must be called before use.");
    }
  }
}
