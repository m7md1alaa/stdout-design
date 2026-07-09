import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";

import { createServer } from "vite";
import type { ViteDevServer } from "vite";
import { ViteNodeRunner } from "vite-node/client";
import { ViteNodeServer } from "vite-node/server";
import { installSourcemapsSupport } from "vite-node/source-map";
import { z } from "zod";

/**
 * Loads templates and studio.config.ts via a real Vite SSR module graph
 * (through vite-node) instead of Node's native `import()` with a
 * timestamp-busted cache key.
 *
 * This matters for two concrete reasons:
 *
 * 1. `import(\`\${path}?t=\${Date.now()}\`)` creates a brand new entry in
 *    Node's ESM module registry on every single reload, and that registry
 *    is never garbage collected for the life of the process. In a long
 *    `studio dev` session with frequent saves, that is an unbounded memory
 *    leak. vite-node's `ModuleCacheMap` is an explicit, inspectable cache
 *    we control directly -- we invalidate exactly the entries that changed,
 *    nothing leaks.
 *
 * 2. A broken template file (syntax error, throwing on import, a missing
 *    dependency) must not crash the whole loader. Every template is loaded
 *    in isolation; a failure marks that one template as errored and leaves
 *    every other template usable.
 */

// ---------------------------------------------------------------------
// Config schema -- validated at load time so a malformed studio.config.ts
// fails with a specific, actionable error instead of a confusing
// downstream TypeError several calls later.
// ---------------------------------------------------------------------

const templateEntrySchema = z.object({
  componentPath: z.string().min(1, "componentPath is required"),
  description: z.string().optional(),
});

const presetSchema = z.object({
  height: z.number().int().positive(),
  id: z.string().min(1),
  platform: z.string().min(1),
  width: z.number().int().positive(),
});

const studioConfigSchema = z.object({
  defaultPreset: z.string().optional(),
  locales: z.array(z.string()).optional(),
  outDir: z.string().optional(),
  presets: z.array(presetSchema),
  templates: z.record(z.string(), templateEntrySchema),
});

export type StudioConfig = z.infer<typeof studioConfigSchema>;

// ---------------------------------------------------------------------
// Template module contract -- what a template file is expected to export.
// ---------------------------------------------------------------------

export interface TemplateModule {
  /** A React function component. Typed loosely here (not importing `react`
   * into core's template-loading types) to keep this package decoupled
   * from a specific React version; callers that need the stricter
   * `FunctionComponent<P>` shape (e.g. `createElement`) should treat this
   * as `FunctionComponent<Record<string, unknown>>` at the call site. */
  default: (props: Record<string, unknown>) => unknown;
  /** Must be a ZodObject (not a bare ZodTypeAny) -- templates take a named
   * props bag, not an arbitrary schema shape. This matches PropSchema in
   * core's shared/props.ts, which validateProps requires. */
  propsSchema: z.ZodObject<Record<string, z.ZodTypeAny>>;
}

export type TemplateLoadState =
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

export class TemplateConfigError extends Error {
  constructor(
    message: string,
    public readonly issues: z.ZodIssue[]
  ) {
    super(message);
    this.name = "TemplateConfigError";
  }
}

export class TemplateLoader {
  private readonly rootDir: string;
  private readonly configPath: string;

  private viteServer: ViteDevServer | null = null;
  private nodeServer: ViteNodeServer | null = null;
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
      root: this.rootDir,
      server: { hmr: false, middlewareMode: true },
      ssr: { optimizeDeps: { include: ["zod"] } },
    });

    // Vite's own dependency-graph invalidation (configFileDependencies,
    // moduleGraph) is what we lean on for "did this file or anything it
    // imports change" -- we don't reimplement that ourselves.
    this.nodeServer = new ViteNodeServer(this.viteServer);
    installSourcemapsSupport({
      getSourceMap: (source) => this.nodeServer!.getSourceMap(source),
    });

    this.runner = new ViteNodeRunner({
      fetchModule: (id) => this.nodeServer!.fetchModule(id),
      resolveId: (id, importer) => this.nodeServer!.resolveId(id, importer),
      root: this.viteServer.config.root,
    });

    this.started = true;
  }

  async stop(): Promise<void> {
    await this.viteServer?.close();
    this.started = false;
    this.viteServer = null;
    this.nodeServer = null;
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
    return this.toTemplateInfo(entry);
  }

  /**
   * Full reload: config + every template. Used when studio.config.ts
   * itself changes, since template registration may have changed.
   */
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
    return entry ? this.toTemplateInfo(entry) : null;
  }

  getAllTemplateInfo(): TemplateInfo[] {
    return [...this.templates.values()].map((entry) =>
      this.toTemplateInfo(entry)
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
      const error =
        error instanceof Error ? error : new Error(String(error));
      entry.state = { error, status: "error" };
    }
  }

  private async importFresh(modulePath: string): Promise<unknown> {
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

  private toTemplateInfo(entry: RegisteredTemplate): TemplateInfo {
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

// ---------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------

function validateTemplateModule(
  mod: unknown,
  templateId: string
): TemplateModule {
  const candidate = mod as Partial<TemplateModule> | null | undefined;

  if (!candidate || typeof candidate.default !== "function") {
    throw new Error(
      `Template "${templateId}" must have a default export that is a component function.`
    );
  }

  if (!(candidate.propsSchema instanceof z.ZodObject)) {
    throw new Error(
      `Template "${templateId}" must export a "propsSchema" that is a z.object({...}) describing its props.`
    );
  }

  return candidate as TemplateModule;
}

function summarizeZodIssues(issues: z.ZodIssue[]): string {
  return issues
    .map((issue) => `${issue.path.join(".") || "(root)"}: ${issue.message}`)
    .join("; ");
}

/**
 * Minimal zod -> JSON-Schema-shaped object for transport over the MCP/HTTP
 * boundary (see core's prop-schema module for the full shared version).
 * Kept intentionally small here; the dev-server and mcp packages both
 * import the shared implementation from `@studio/core/shared/schema` --
 * this local copy exists only to keep this file's example self-contained.
 */
function zodToJsonSchemaShape(schema: z.ZodTypeAny): Record<string, unknown> {
  // Real implementation should delegate to a single shared
  // zod-to-json-schema utility (e.g. the `zod-to-json-schema` package) so
  // the CLI, MCP server, and web-ui prop panel all describe a template's
  // props identically. Stubbed here to keep this file's concern (loading)
  // separate from that concern (schema transport).
  return { _description: "see shared zod-to-json-schema utility", schema };
}
