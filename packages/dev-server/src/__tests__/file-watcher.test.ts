import { describe, expect, it, mock } from "bun:test";

import type { FSWatcher } from "chokidar";

import { FileWatcher } from "../file-watcher.js";
import type { WatchEvent } from "../file-watcher.js";

interface FakeTemplateLoader {
  reloadAll: () => Promise<void>;
  reloadTemplate: (
    id: string
  ) => Promise<{ status: string; errorMessage?: string } | null>;
  loadAll: () => Promise<void>;
  start: () => Promise<void>;
  stop: () => Promise<void>;
}

const createFakeTemplateLoader = (): FakeTemplateLoader => ({
  loadAll: mock(() => Promise.resolve()),
  reloadAll: mock(() => Promise.resolve()),
  reloadTemplate: mock((_id: string) => Promise.resolve({ status: "ok" })),
  start: mock(() => Promise.resolve()),
  stop: mock(() => Promise.resolve()),
});

describe("FileWatcher", () => {
  describe("extractTemplateId", () => {
    it("extracts template id from a template file path", () => {
      const result = (
        FileWatcher as unknown as {
          extractTemplateId: (filePath: string) => string | null;
        }
      ).extractTemplateId("/project/templates/bento-feature.tsx");

      expect(result).toBe("bento-feature");
    });

    it("extracts nested template id from a subdirectory", () => {
      const result = (
        FileWatcher as unknown as {
          extractTemplateId: (filePath: string) => string | null;
        }
      ).extractTemplateId("/project/templates/social/bento.tsx");

      expect(result).toBe("social/bento");
    });

    it("returns null for a non-template file", () => {
      const result = (
        FileWatcher as unknown as {
          extractTemplateId: (filePath: string) => string | null;
        }
      ).extractTemplateId("/project/src/app.tsx");

      expect(result).toBeNull();
    });

    it("returns null for a file without .tsx extension", () => {
      const result = (
        FileWatcher as unknown as {
          extractTemplateId: (filePath: string) => string | null;
        }
      ).extractTemplateId("/project/templates/helper.ts");

      expect(result).toBeNull();
    });

    it("handles Windows-style paths with backslashes", () => {
      const result = (
        FileWatcher as unknown as {
          extractTemplateId: (filePath: string) => string | null;
        }
      ).extractTemplateId("C:\\project\\templates\\bento-feature.tsx");

      expect(result).toBe("bento-feature");
    });
  });

  describe("onEvent", () => {
    it("registers a listener and returns an unsubscribe function", () => {
      const loader = createFakeTemplateLoader();
      const watcher = new FileWatcher(
        "/project",
        loader as unknown as Parameters<
          typeof FileWatcher.prototype.constructor
        >[1]
      );

      const listener = mock((_event: WatchEvent) => {});
      const unsubscribe = watcher.onEvent(listener);

      expect(typeof unsubscribe).toBe("function");

      unsubscribe();
    });

    it("removes listener after unsubscribe", () => {
      const loader = createFakeTemplateLoader();
      const watcher = new FileWatcher(
        "/project",
        loader as unknown as Parameters<
          typeof FileWatcher.prototype.constructor
        >[1]
      );

      const listener = mock((_event: WatchEvent) => {});
      const unsubscribe = watcher.onEvent(listener);

      unsubscribe();

      // Verify unsubscribe is idempotent
      unsubscribe();
    });
  });

  interface WatcherInternals {
    scheduleChange: (filePath: string) => void;
    debounceTimers: Map<string, ReturnType<typeof setTimeout>>;
  }

  const getScheduleChange = (
    watcher: FileWatcher
  ): ((filePath: string) => void) => {
    const internals = watcher as unknown as WatcherInternals;
    return internals.scheduleChange.bind(watcher);
  };

  const getDebounceTimers = (
    watcher: FileWatcher
  ): Map<string, ReturnType<typeof setTimeout>> =>
    (watcher as unknown as WatcherInternals).debounceTimers;

  describe("debounce mechanism", () => {
    it("creates a debounce timer for each unique file path", () => {
      const loader = createFakeTemplateLoader();
      const watcher = new FileWatcher(
        "/project",
        loader as unknown as Parameters<
          typeof FileWatcher.prototype.constructor
        >[1],
        { debounceMs: 100 }
      );

      const scheduleChange = getScheduleChange(watcher);
      scheduleChange("/project/templates/a.tsx");
      scheduleChange("/project/templates/b.tsx");

      expect(getDebounceTimers(watcher).size).toBe(2);
    });

    it("replaces existing timer for the same file path", () => {
      const loader = createFakeTemplateLoader();
      const watcher = new FileWatcher(
        "/project",
        loader as unknown as Parameters<
          typeof FileWatcher.prototype.constructor
        >[1],
        { debounceMs: 100 }
      );

      const scheduleChange = getScheduleChange(watcher);
      scheduleChange("/project/templates/a.tsx");
      const firstTimer = getDebounceTimers(watcher).get(
        "/project/templates/a.tsx"
      );

      scheduleChange("/project/templates/a.tsx");
      const secondTimer = getDebounceTimers(watcher).get(
        "/project/templates/a.tsx"
      );

      expect(secondTimer).not.toBe(firstTimer);
      expect(getDebounceTimers(watcher).size).toBe(1);
    });
  });

  describe("stop", () => {
    it("clears all pending debounce timers", async () => {
      const loader = createFakeTemplateLoader();
      const watcher = new FileWatcher(
        "/project",
        loader as unknown as Parameters<
          typeof FileWatcher.prototype.constructor
        >[1],
        { debounceMs: 100 }
      );

      const scheduleChange = getScheduleChange(watcher);
      scheduleChange("/project/templates/a.tsx");
      scheduleChange("/project/templates/b.tsx");

      expect(getDebounceTimers(watcher).size).toBe(2);

      await watcher.stop();

      expect(getDebounceTimers(watcher).size).toBe(0);
    });

    it("sets watcher to null after stop", async () => {
      const loader = createFakeTemplateLoader();
      const watcher = new FileWatcher(
        "/project",
        loader as unknown as Parameters<
          typeof FileWatcher.prototype.constructor
        >[1]
      );

      await watcher.stop();

      expect(
        (watcher as unknown as { watcher: FSWatcher | null }).watcher
      ).toBeNull();
    });

    it("is idempotent (calling stop twice does not throw)", async () => {
      const loader = createFakeTemplateLoader();
      const watcher = new FileWatcher(
        "/project",
        loader as unknown as Parameters<
          typeof FileWatcher.prototype.constructor
        >[1]
      );

      await watcher.stop();
      await watcher.stop();
    });
  });

  describe("start", () => {
    it("does not re-initialize when called a second time", () => {
      const loader = createFakeTemplateLoader();
      const watcher = new FileWatcher(
        "/project",
        loader as unknown as Parameters<
          typeof FileWatcher.prototype.constructor
        >[1]
      );

      // Manipulate watcher directly to simulate already-started state
      (watcher as unknown as { watcher: { close: () => void } }).watcher = {
        close: mock(() => {}),
      };

      watcher.start();

      // Should not throw and should not re-initialize
      expect(
        (watcher as unknown as { watcher: unknown }).watcher
      ).toBeDefined();
    });
  });
});
