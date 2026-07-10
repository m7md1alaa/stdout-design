import { describe, expect, it } from "bun:test";

import { ConcurrencyLimiter } from "./concurrency-limiter.js";

const sleep = (ms: number): Promise<void> => {
  const { promise, resolve } = Promise.withResolvers<undefined>();
  setTimeout(resolve, ms);
  return promise;
};

describe("ConcurrencyLimiter", () => {
  it("is unbounded by default -- all tasks start immediately", async () => {
    const limiter = new ConcurrencyLimiter();
    expect(limiter.isBounded).toBe(false);

    let concurrentPeak = 0;
    let active = 0;

    const task = async () => {
      active += 1;
      concurrentPeak = Math.max(concurrentPeak, active);
      await sleep(10);
      active -= 1;
    };

    await Promise.all(Array.from({ length: 10 }, () => limiter.run(task)));

    expect(concurrentPeak).toBe(10);
  });

  it("never exceeds the configured concurrency cap under a burst of submitted work", async () => {
    const CAP = 3;
    const TOTAL = 20;
    const limiter = new ConcurrencyLimiter(CAP);

    let active = 0;
    let concurrentPeak = 0;

    const task = async () => {
      active += 1;
      concurrentPeak = Math.max(concurrentPeak, active);
      // Small random-ish jitter so tasks don't all resolve in lockstep,
      // which would hide an off-by-one in the limiter.
      await sleep(5 + (active % 3));
      active -= 1;
    };

    await Promise.all(Array.from({ length: TOTAL }, () => limiter.run(task)));

    expect(concurrentPeak).toBeLessThanOrEqual(CAP);
    // and it should actually reach the cap, not under-utilize it
    expect(concurrentPeak).toBe(CAP);
  });

  it("a non-positive concurrency value is treated as unbounded, not zero", async () => {
    const limiter = new ConcurrencyLimiter(0);
    expect(limiter.isBounded).toBe(false);

    // If 0 were interpreted literally by p-limit, this would hang forever.
    const result = await Promise.race([
      // oxlint-disable-next-line promise/no-return-wrap
      limiter.run(() => Promise.resolve("done")),
      sleep(200).then(() => "timeout"),
    ]);
    expect(result).toBe("done");
  });

  it("propagates a rejected task's error without swallowing it", async () => {
    const limiter = new ConcurrencyLimiter(2);
    await expect(
      limiter.run(() => Promise.reject(new Error("boom")))
    ).rejects.toThrow("boom");
  });

  it("one task rejecting does not block or cancel the others queued behind the cap", async () => {
    const limiter = new ConcurrencyLimiter(1);

    const failing = limiter.run(() => Promise.reject(new Error("boom")));
    const succeeding = limiter.run(() => Promise.resolve("ok"));

    await expect(failing).rejects.toThrow("boom");
    await expect(succeeding).resolves.toBe("ok");
  });

  it("activeCount and pendingCount reflect in-flight and queued work while bounded", async () => {
    const limiter = new ConcurrencyLimiter(1);
    const control: { release?: () => void } = {};

    const { promise: blocker, resolve: releaseBlocker } =
      Promise.withResolvers<undefined>();
    control.release = releaseBlocker;

    const firstTask = limiter.run(async () => {
      await blocker;
      return "first";
    });
    const secondTask = limiter.run(() => Promise.resolve("second"));

    // Give the microtask queue a tick to let the first task actually start.
    await sleep(5);

    expect(limiter.activeCount).toBe(1);
    // second is queued behind the cap
    expect(limiter.pendingCount).toBe(1);

    control.release?.();
    await Promise.all([firstTask, secondTask]);

    expect(limiter.activeCount).toBe(0);
    expect(limiter.pendingCount).toBe(0);
  });

  it("activeCount/pendingCount report 0 when unbounded (no internal queue to report)", () => {
    const limiter = new ConcurrencyLimiter();
    expect(limiter.activeCount).toBe(0);
    expect(limiter.pendingCount).toBe(0);
  });
});
