import { afterEach, beforeEach, describe, expect, it } from "bun:test";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";

import { install as installFakeTimers } from "@sinonjs/fake-timers";
import type { Clock } from "@sinonjs/fake-timers";
import lockfile from "proper-lockfile";

import { EvictionCoordinator } from "./eviction-coordinator.js";

const makeTempDir = (): string =>
  mkdtempSync(path.join(tmpdir(), "eviction-coordinator-test-"));

const rmDir = (dir: string): void =>
  rmSync(dir, { force: true, recursive: true });

// ---------------------------------------------------------------------
// Debounce/batching logic: real timers replaced with fake ones, so these
// run instantly and deterministically instead of needing real sleep()
// calls scattered through the suite.
// ---------------------------------------------------------------------

describe("EvictionCoordinator: debounce behavior (fake timers)", () => {
  let clock: Clock;
  let dir: string;

  beforeEach(() => {
    dir = makeTempDir();
    clock = installFakeTimers();
  });

  afterEach(() => {
    clock.uninstall();
    rmDir(dir);
  });

  it("requestEviction() does not run the sweep synchronously", () => {
    let sweepCalls = 0;
    const coordinator = new EvictionCoordinator({
      debounceMs: 250,
      getCurrentTotalBytes: () => Promise.resolve(1000),
      lockTargetPath: dir,
      maxSizeBytes: 500,
      sweep: () => {
        sweepCalls += 1;
        return Promise.resolve({ freedBytes: 0 });
      },
    });

    coordinator.requestEviction();
    expect(sweepCalls).toBe(0);
  });

  it("does not sweep at all if the total never exceeds budget", async () => {
    let sweepCalls = 0;
    const coordinator = new EvictionCoordinator({
      debounceMs: 100,
      getCurrentTotalBytes: () => Promise.resolve(100),
      lockTargetPath: dir,
      maxSizeBytes: 500,
      sweep: () => {
        sweepCalls += 1;
        return Promise.resolve({ freedBytes: 0 });
      },
    });

    coordinator.requestEviction();
    await clock.tickAsync(100);

    expect(sweepCalls).toBe(0);
  });

  it("cancelPending() prevents an already-scheduled sweep from firing", async () => {
    let sweepCalls = 0;
    const coordinator = new EvictionCoordinator({
      debounceMs: 250,
      getCurrentTotalBytes: () => Promise.resolve(1000),
      lockTargetPath: dir,
      maxSizeBytes: 500,
      sweep: () => {
        sweepCalls += 1;
        return Promise.resolve({ freedBytes: 0 });
      },
    });

    coordinator.requestEviction();
    coordinator.cancelPending();
    await clock.tickAsync(1000);

    expect(sweepCalls).toBe(0);
  });
});

// ---------------------------------------------------------------------
// Real-timer tests: these exercise the async sweep path that fake timers
// cannot drive correctly (the microtask queue from async/await doesn't
// flush predictably under sinonjs/fake-timers on Bun).
// ---------------------------------------------------------------------

describe("EvictionCoordinator: debounce behavior (real timers)", () => {
  let dir: string;

  beforeEach(() => {
    dir = makeTempDir();
  });

  afterEach(() => {
    rmDir(dir);
  });

  it("runs the sweep once the debounce window elapses", async () => {
    let sweepCalls = 0;
    const coordinator = new EvictionCoordinator({
      debounceMs: 10,
      getCurrentTotalBytes: () => Promise.resolve(1000),
      lockTargetPath: dir,
      maxSizeBytes: 500,
      sweep: () => {
        sweepCalls += 1;
        return Promise.resolve({ freedBytes: 0 });
      },
    });

    coordinator.requestEviction();
    const { promise: p, resolve: r } = Promise.withResolvers<undefined>();
    setTimeout(r, 50);
    await p;
    expect(sweepCalls).toBe(1);
  });

  it("collapses a burst of requestEviction() calls into a single sweep", async () => {
    let sweepCalls = 0;
    const coordinator = new EvictionCoordinator({
      debounceMs: 10,
      getCurrentTotalBytes: () => Promise.resolve(1000),
      lockTargetPath: dir,
      maxSizeBytes: 500,
      sweep: () => {
        sweepCalls += 1;
        return Promise.resolve({ freedBytes: 0 });
      },
    });

    for (let i = 0; i < 50; i += 1) {
      coordinator.requestEviction();
    }
    const { promise: p, resolve: r } = Promise.withResolvers<undefined>();
    setTimeout(r, 50);
    await p;
    expect(sweepCalls).toBeLessThanOrEqual(1);
  });

  it("a subsequent requestEviction() after a completed sweep schedules a new one", async () => {
    let sweepCalls = 0;
    const coordinator = new EvictionCoordinator({
      debounceMs: 5,
      getCurrentTotalBytes: () => Promise.resolve(1000),
      lockTargetPath: dir,
      maxSizeBytes: 500,
      sweep: () => {
        sweepCalls += 1;
        return Promise.resolve({ freedBytes: 0 });
      },
    });

    coordinator.requestEviction();
    const { promise: p1, resolve: r1 } = Promise.withResolvers<undefined>();
    setTimeout(r1, 20);
    await p1;
    expect(sweepCalls).toBe(1);

    coordinator.requestEviction();
    const { promise: p2, resolve: r2 } = Promise.withResolvers<undefined>();
    setTimeout(r2, 20);
    await p2;
    expect(sweepCalls).toBe(2);
  });
});

// ---------------------------------------------------------------------
// Cross-process locking: real proper-lockfile, real timers. Mocking the
// lock library away would test nothing -- its correctness under actual
// OS-level file locking is the entire reason it was adopted.
// ---------------------------------------------------------------------

describe("EvictionCoordinator: locking (real proper-lockfile)", () => {
  let dir: string;

  beforeEach(() => {
    dir = makeTempDir();
  });

  afterEach(() => {
    rmDir(dir);
  });

  it("runFullSweep() acquires and releases the lock around a successful sweep", async () => {
    const coordinator = new EvictionCoordinator({
      getCurrentTotalBytes: () => Promise.resolve(0),
      lockTargetPath: dir,
      maxSizeBytes: 100,
      sweep: () => Promise.resolve({ freedBytes: 123 }),
    });

    const result = await coordinator.runFullSweep();
    expect(result.freedBytes).toBe(123);

    // Lock must be released afterward -- a second sweep should also succeed.
    const secondResult = await coordinator.runFullSweep();
    expect(secondResult.freedBytes).toBe(123);
  });

  it("skips the pass (returns freedBytes: 0) rather than throwing or blocking when another process already holds the lock", async () => {
    const release = await lockfile.lock(dir, { retries: 0 });

    try {
      let sweepCalls = 0;
      const coordinator = new EvictionCoordinator({
        getCurrentTotalBytes: () => Promise.resolve(0),
        lockTargetPath: dir,
        maxSizeBytes: 100,
        sweep: () => {
          sweepCalls += 1;
          return Promise.resolve({ freedBytes: 999 });
        },
      });

      const result = await coordinator.runFullSweep();

      // skipped, not the sweep's real return value
      expect(result.freedBytes).toBe(0);
      // sweep function never actually ran
      expect(sweepCalls).toBe(0);
    } finally {
      await release();
    }
  });

  it("releases the lock even if the sweep function throws, so a failed sweep doesn't permanently wedge future sweeps", async () => {
    const coordinator = new EvictionCoordinator({
      getCurrentTotalBytes: () => Promise.resolve(0),
      lockTargetPath: dir,
      maxSizeBytes: 100,
      sweep: () => {
        throw new Error("sweep exploded");
      },
    });

    await expect(coordinator.runFullSweep()).rejects.toThrow("sweep exploded");

    // If the lock weren't released in a finally block, this second call
    // would hang or fail to acquire the lock.
    const workingCoordinator = new EvictionCoordinator({
      getCurrentTotalBytes: () => Promise.resolve(0),
      lockTargetPath: dir,
      maxSizeBytes: 100,
      sweep: () => Promise.resolve({ freedBytes: 1 }),
    });
    const result = await workingCoordinator.runFullSweep();
    expect(result.freedBytes).toBe(1);
  });

  it("two coordinators racing runFullSweep() on the same directory never run their sweep functions concurrently", async () => {
    const active: number[] = [];
    let concurrentPeak = 0;

    const makeCoordinator = () =>
      new EvictionCoordinator({
        getCurrentTotalBytes: () => Promise.resolve(0),
        lockTargetPath: dir,
        maxSizeBytes: 100,
        sweep: async () => {
          active.push(1);
          concurrentPeak = Math.max(concurrentPeak, active.length);
          const { promise, resolve } = Promise.withResolvers<undefined>();
          setTimeout(resolve, 20);
          await promise;
          active.pop();
          return { freedBytes: 1 };
        },
      });

    const coordinatorA = makeCoordinator();
    const coordinatorB = makeCoordinator();

    // Both race for the lock; one succeeds and runs its sweep, the other
    // should see the lock held and skip (freedBytes: 0) rather than
    // running concurrently.
    const [resultA, resultB] = await Promise.all([
      coordinatorA.runFullSweep(),
      coordinatorB.runFullSweep(),
    ]);

    // never both inside the sweep at once
    expect(concurrentPeak).toBe(1);
    const freedValues = [resultA.freedBytes, resultB.freedBytes].toSorted();
    // one ran, one skipped
    expect(freedValues).toEqual([0, 1]);
  });
});
