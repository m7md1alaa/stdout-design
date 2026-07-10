import lockfile from "proper-lockfile";

import { logDebug, logWarn } from "../shared/logger.js";

export interface SweepResult {
  freedBytes: number;
}

export interface EvictionCoordinatorOptions {
  /** Path locked around a sweep -- typically the cache directory itself. Must exist before `lock()` is called. */
  lockTargetPath: string;
  maxSizeBytes: number;
  /** Debounce window between a write and the next eviction check. Default 250ms. */
  debounceMs?: number;
  getCurrentTotalBytes: () => Promise<number>;
  sweep: (options: { full: boolean }) => Promise<SweepResult>;
}

const DEFAULT_DEBOUNCE_MS = 250;

/**
 * Coordinates eviction across both time (debouncing) and processes
 * (advisory locking), replacing two things from the old monolithic
 * RenderCache:
 *
 * 1. Eviction ran synchronously inside every `setStageB` call, doing a
 *    full-table SUM and (once over budget) a full-table ORDER BY on
 *    every single write. Here, a write just calls `requestEviction()`,
 *    which schedules a debounced check -- the expensive scan runs at
 *    most once per debounce window, not once per write.
 *
 * 2. Multi-process safety was implicit ("WAL mode makes concurrent DB
 *    access safe"), which said nothing about the filesystem-level TOCTOU
 *    race in delete. `proper-lockfile` wraps the actual sweep in an
 *    advisory lock so only one process ever runs a sweep at a time --
 *    the delete race is eliminated by construction (only one actor ever
 *    deletes at once) rather than caught after the fact.
 */
export class EvictionCoordinator {
  private readonly lockTargetPath: string;
  private readonly maxSizeBytes: number;
  private readonly debounceMs: number;
  private readonly getCurrentTotalBytes: () => Promise<number>;
  private readonly sweepFn: (options: {
    full: boolean;
  }) => Promise<SweepResult>;

  private debounceTimer: ReturnType<typeof setTimeout> | null = null;

  constructor(options: EvictionCoordinatorOptions) {
    this.lockTargetPath = options.lockTargetPath;
    this.maxSizeBytes = options.maxSizeBytes;
    this.debounceMs = options.debounceMs ?? DEFAULT_DEBOUNCE_MS;
    this.getCurrentTotalBytes = options.getCurrentTotalBytes;
    this.sweepFn = options.sweep;
  }

  /**
   * Call after every write. Schedules (or no-ops if one is already
   * scheduled) a debounced budget check -- callers never pay the full
   * scan cost inline.
   */
  requestEviction(): void {
    if (this.debounceTimer) {
      return;
    }
    this.debounceTimer = setTimeout(async () => {
      this.debounceTimer = null;
      try {
        await this.runIfOverBudget();
      } catch (error) {
        logWarn("EvictionCoordinator: debounced sweep failed", {
          error: String(error),
        });
      }
    }, this.debounceMs);
    // Don't keep the process alive solely for a pending eviction check.
    this.debounceTimer.unref?.();
  }

  /** Checks the current total against budget and runs a partial sweep only if over. */
  async runIfOverBudget(): Promise<SweepResult> {
    const total = await this.getCurrentTotalBytes();
    if (total <= this.maxSizeBytes) {
      return { freedBytes: 0 };
    }
    return this.runSweep({ full: false });
  }

  /** Forces a full wipe (backs the public `clean()` API), still funneled through the same lock so it can't race another process's sweep. */
  runFullSweep(): Promise<SweepResult> {
    return this.runSweep({ full: true });
  }

  private async runSweep(options: { full: boolean }): Promise<SweepResult> {
    let release: (() => Promise<void>) | null = null;
    try {
      release = await lockfile.lock(this.lockTargetPath, {
        retries: 0,
        stale: 10_000,
      });
    } catch (error) {
      // Another process holds the lock right now -- skip this pass
      // rather than blocking or racing it. The next write's debounced
      // check (or a future explicit clean() call) will retry.
      logDebug("EvictionCoordinator: lock held elsewhere, skipping this pass", {
        error: String(error),
      });
      return { freedBytes: 0 };
    }

    try {
      return await this.sweepFn(options);
    } finally {
      await release();
    }
  }

  /** Cancels any pending debounced sweep. Call on shutdown so a timer doesn't fire after the owning cache has closed. */
  cancelPending(): void {
    if (this.debounceTimer) {
      clearTimeout(this.debounceTimer);
      this.debounceTimer = null;
    }
  }
}
