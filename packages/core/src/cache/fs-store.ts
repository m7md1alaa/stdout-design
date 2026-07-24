import { createHash } from "node:crypto";
import { existsSync as realExistsSync } from "node:fs";
import {
  readFile as realReadFile,
  stat as realStat,
  unlink as realUnlink,
} from "node:fs/promises";

import realWriteFileAtomic from "write-file-atomic";

import { logDebug, logWarn } from "../shared/logger.js";
import type { ConcurrencyLimiter } from "./concurrency-limiter.js";

/**
 * The filesystem primitives FsStore depends on, injectable so tests can
 * supply deterministic fakes (e.g. a writer that stalls mid-write to
 * reproduce a race) instead of mocking node:fs/promises at the module
 * level. Defaults to the real implementations below.
 */
export interface FsPrimitives {
  writeFileAtomic: (filePath: string, data: Buffer) => Promise<void>;
  existsSync: (filePath: string) => boolean;
  stat: (filePath: string) => Promise<{ size: number }>;
  readFile: (filePath: string) => Promise<Buffer>;
  unlink: (filePath: string) => Promise<void>;
}

export const defaultFsPrimitives: FsPrimitives = {
  existsSync: realExistsSync,
  readFile: realReadFile,
  stat: (filePath) => realStat(filePath),
  unlink: realUnlink,
  writeFileAtomic: (filePath, data) => realWriteFileAtomic(filePath, data),
};

/**
 * Filesystem I/O for pixel cache entries.
 *
 * Replaces two things from the old monolithic RenderCache:
 *
 * 1. The hand-rolled tmp-file-then-rename with a copy+unlink fallback on
 *    cross-device rename (EXDEV). That fallback was NOT atomic -- a
 *    concurrent reader could observe a partially-copied file at the final
 *    path. `write-file-atomic` (maintained by the npm CLI team, who hit
 *    this exact problem with npm's own package cache) handles the
 *    cross-device case correctly.
 *
 * 2. The size-only integrity check on read (comparing `stat().size`
 *    against a DB column). A same-size bit-flip was silently served as
 *    valid. `Bun.hash()` gives us a cheap digest to verify content, not
 *    just length, on every read.
 *
 * This class knows nothing about SQLite or eviction policy -- it only
 * knows how to put bytes on disk safely and get verified bytes back.
 */
export class FsStore {
  private readonly limiter: ConcurrencyLimiter | undefined;
  private readonly fs: FsPrimitives;

  constructor(
    limiter?: ConcurrencyLimiter,
    fs: FsPrimitives = defaultFsPrimitives
  ) {
    this.limiter = limiter;
    this.fs = fs;
  }

  /**
   * Non-cryptographic content hash, used purely for corruption detection
   * within a cache whose entries are always regenerable -- not for
   * anything requiring cross-version stability or resistance to
   * intentional tampering. Bun.hash()'s algorithm is not a documented,
   * version-stable guarantee; if a future Bun upgrade changes it, the
   * worst case is a one-time false "corrupted" verdict that costs a
   * re-render, not data loss.
   */
  // oxlint-disable-next-line eslint/class-methods-use-this
  computeHash(bytes: Buffer): string {
    // Bun.hash() is a fast non-cryptographic hash. In Node.js, SHA-256
    // from node:crypto is used instead. The two are not interchangeable
    // across runtimes, but each runtime is self-consistent for cache
    // corruption detection.
    const bunGlobal = (globalThis as Record<string, unknown>).Bun as
      | { hash: (data: Uint8Array) => number }
      | undefined;
    if (bunGlobal) {
      return bunGlobal.hash(bytes).toString(16);
    }
    return createHash("sha256").update(bytes).digest("hex");
  }

  /**
   * Writes `bytes` to `filePath` atomically: either the write is fully
   * visible at `filePath` or `filePath` doesn't change at all. No caller
   * ever observes a partial file at the final path, including across a
   * cross-device fallback.
   */
  async writeAtomic(filePath: string, bytes: Buffer): Promise<void> {
    const doWrite = () => this.fs.writeFileAtomic(filePath, bytes);
    await (this.limiter ? this.limiter.run(doWrite) : doWrite());
  }

  /**
   * Reads `filePath` and verifies both size and content hash against the
   * expected values before returning it. Returns `null` (and does NOT
   * throw) on any mismatch or read failure -- callers are expected to
   * treat `null` as "entry is gone/invalid, self-heal by forgetting it,"
   * matching the old cache's missing-file behavior, now extended to
   * cover content corruption too instead of only missing/truncated files.
   */
  readVerified(
    filePath: string,
    expectedSizeBytes: number,
    expectedContentHash: string
  ): Promise<Buffer | null> {
    const doRead = () =>
      this.readVerifiedUnbounded(
        filePath,
        expectedSizeBytes,
        expectedContentHash
      );
    return this.limiter ? this.limiter.run(doRead) : doRead();
  }

  private async readVerifiedUnbounded(
    filePath: string,
    expectedSizeBytes: number,
    expectedContentHash: string
  ): Promise<Buffer | null> {
    if (!this.fs.existsSync(filePath)) {
      logDebug("FsStore: cached file missing on read", { filePath });
      return null;
    }

    const fileStat = await this.fs.stat(filePath);
    if (fileStat.size !== expectedSizeBytes) {
      logWarn("FsStore: size mismatch on read, treating as corrupt", {
        expected: expectedSizeBytes,
        filePath,
        onDisk: fileStat.size,
      });
      return null;
    }

    const bytes = await this.fs.readFile(filePath);
    const actualHash = this.computeHash(bytes);
    if (actualHash !== expectedContentHash) {
      logWarn("FsStore: content-hash mismatch on read, treating as corrupt", {
        expected: expectedContentHash,
        filePath,
      });
      return null;
    }

    return bytes;
  }

  /**
   * Removes a cache entry's file, if present. Returns the number of
   * bytes actually freed. Tolerant of the file already being gone (a
   * concurrent process may have removed it first) -- this is the TOCTOU
   * gap from the old implementation, still possible here since checking
   * existence and then deleting is inherently two steps, but now
   * contained to one small, well-tested method instead of being
   * duplicated across the eviction and clean code paths.
   */
  async delete(filePath: string, knownSizeBytes?: number): Promise<number> {
    if (!this.fs.existsSync(filePath)) {
      return 0;
    }

    let freed = knownSizeBytes ?? 0;
    try {
      if (knownSizeBytes === undefined) {
        const fileStat = await this.fs.stat(filePath);
        freed = fileStat.size;
      }
      await this.fs.unlink(filePath);
    } catch (error) {
      logWarn("FsStore: failed to delete cache entry file", {
        error: String(error),
        filePath,
      });
      return freed;
    }

    return freed;
  }
}
