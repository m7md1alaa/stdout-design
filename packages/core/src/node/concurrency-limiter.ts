import pLimit from "p-limit";
import type { LimitFunction } from "p-limit";

/**
 * Bounds how many concurrent operations (writes/reads through FsStore)
 * run at once. Exists to cap the "N concurrent large-buffer renders spike
 * RSS" risk at the layer that actually does the I/O, rather than trusting
 * every future caller (CLI batch executor, dev-server, MCP) to remember
 * to throttle itself.
 *
 * Deliberately a thin wrapper, not a reimplementation -- p-limit is the
 * de facto standard promise concurrency limiter in the Node/Bun
 * ecosystem, small and heavily exercised. No maxConcurrent (or a
 * non-positive value) means unbounded, matching the cache's behavior
 * before this existed.
 */
export class ConcurrencyLimiter {
  private readonly limit: LimitFunction | null;

  constructor(maxConcurrent?: number) {
    this.limit =
      maxConcurrent && maxConcurrent > 0 ? pLimit(maxConcurrent) : null;
  }

  run<T>(fn: () => Promise<T>): Promise<T> {
    if (!this.limit) {
      return fn();
    }
    return this.limit(fn);
  }

  get activeCount(): number {
    return this.limit?.activeCount ?? 0;
  }

  get pendingCount(): number {
    return this.limit?.pendingCount ?? 0;
  }

  get isBounded(): boolean {
    return this.limit !== null;
  }
}
