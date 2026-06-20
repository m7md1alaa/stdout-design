import { watch } from "chokidar";
import type { FSWatcher } from "chokidar";

import type { TemplateLoader } from "./template-loader.js";

export interface WatchEvent {
  type: "full" | "template" | "template-error";
  templateId?: string;
  error?: Error;
}

export interface FileWatcherOptions {
  /** Debounce window per changed file, in ms. Default 200. */
  debounceMs?: number;
}

/**
 * Watches studio.config.ts and the templates/ directory, triggering
 * TemplateLoader reloads on change and notifying listeners (the dev-server
 * SSE endpoint) of what changed.
 */
export class FileWatcher {
  private readonly rootDir: string;
  private readonly templateLoader: TemplateLoader;
  private readonly listeners = new Set<(event: WatchEvent) => void>();
  private readonly debounceTimers = new Map<
    string,
    ReturnType<typeof setTimeout>
  >();
  private readonly debounceMs: number;
  private watcher: FSWatcher | null = null;

  constructor(
    rootDir: string,
    templateLoader: TemplateLoader,
    options?: FileWatcherOptions
  ) {
    this.rootDir = rootDir;
    this.templateLoader = templateLoader;
    this.debounceMs = options?.debounceMs ?? 200;
  }

  start(): void {
    if (this.watcher) {
      return;
    }

    const watchPaths = [
      `${this.rootDir}/templates`,
      `${this.rootDir}/studio.config.ts`,
    ];

    this.watcher = watch(watchPaths, {
      awaitWriteFinish: {
        pollInterval: 50,
        stabilityThreshold: 100,
      },
      ignoreInitial: true,
    });

    this.watcher.on("change", (filePath) => this.scheduleChange(filePath));
    this.watcher.on("unlink", (filePath) => this.scheduleChange(filePath));
    this.watcher.on("add", (filePath) => this.scheduleChange(filePath));

    this.watcher.on("error", (error) => {
      const normalizedError =
        error instanceof Error ? error : new Error(String(error));
      this.emit({ error: normalizedError, type: "template-error" });
    });
  }

  async stop(): Promise<void> {
    for (const timer of this.debounceTimers.values()) {
      clearTimeout(timer);
    }
    this.debounceTimers.clear();

    await this.watcher?.close();
    this.watcher = null;
  }

  onEvent(listener: (event: WatchEvent) => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  /** Per-path debounce: a change to file B never cancels a pending reload for file A. */
  private scheduleChange(filePath: string): void {
    const existing = this.debounceTimers.get(filePath);
    if (existing) {
      clearTimeout(existing);
    }

    const timer = setTimeout(() => {
      this.debounceTimers.delete(filePath);
      void this.handleChange(filePath);
    }, this.debounceMs);

    this.debounceTimers.set(filePath, timer);
  }

  private async handleChange(filePath: string): Promise<void> {
    try {
      if (filePath.endsWith("studio.config.ts")) {
        await this.templateLoader.reloadAll();
        this.emit({ type: "full" });
        return;
      }

      const templateId = FileWatcher.extractTemplateId(filePath);
      if (!templateId) {
        // Changed file inside templates/ that isn't a recognized template
        // entry point (e.g. a shared helper/component file imported by
        // templates, or a non-.tsx asset). We don't know which template(s)
        // depend on it, so the safe behavior is a full reload rather than
        // silently doing nothing.
        await this.templateLoader.reloadAll();
        this.emit({ type: "full" });
        return;
      }

      const info = await this.templateLoader.reloadTemplate(templateId);
      if (info?.status === "error") {
        this.emit({
          error: new Error(info.errorMessage ?? "Unknown template error"),
          templateId,
          type: "template-error",
        });
        return;
      }

      this.emit({ templateId, type: "template" });
    } catch (error) {
      const normalizedError =
        error instanceof Error ? error : new Error(String(error));
      this.emit({ error: normalizedError, type: "template-error" });
    }
  }

  /**
   * Extracts a template id from a changed file path, supporting nested
   * directories under templates/ (e.g. templates/social/bento.tsx ->
   * "social/bento"). Returns null for files that don't look like a
   * template's own .tsx entry point.
   */
  private static extractTemplateId(filePath: string): string | null {
    const match = filePath
      .replaceAll("\\", "/")
      .match(/templates\/(?<templateId>.+)\.tsx$/u);
    return match?.groups?.templateId ?? null;
  }

  private emit(event: WatchEvent): void {
    for (const listener of this.listeners) {
      try {
        listener(event);
      } catch {
        // A listener throwing must not prevent other listeners (or future
        // watch events) from running.
      }
    }
  }
}
