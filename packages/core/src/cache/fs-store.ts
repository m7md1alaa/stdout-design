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

const isFsNotFoundError = (error: unknown): boolean =>
  (error as NodeJS.ErrnoException)?.code === "ENOENT";

/**
 * The filesystem primitives FsStore depends on, injectable so tests can
 * supply deterministic fakes instead of mocking node:fs/promises at the
 * module level.
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
 * Hash algorithm tags stored as a prefix in the content_hash column.
 *
 * FIX: The old implementation used Bun.hash() in Bun and SHA-256 in Node
 * without tagging which algorithm was used. A cache written by one runtime
 * and read by the other would fail the hash check on *every* entry and
 * treat the entire cache as corrupt, silently wiping it. By prefixing with
 * the algorithm name we can detect a cross-runtime mismatch and treat it as
 * a graceful cache miss rather than a corruption verdict.
 */
const HASH_PREFIX_BUN = "bun1:";
const HASH_PREFIX_SHA256 = "sha256:";

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
   * Compute a content hash that is stable within a single runtime and
   * tagged with the algorithm so cross-runtime mismatches are a graceful
   * miss, not a false corruption verdict.
   *
   * Format: "<algorithm>:<hex-digest>"
   *   Bun:   "bun1:<Bun.hash() as hex>"
   *   Node:  "sha256:<sha256 hex>"
   *
   * FIX: was untagged — Bun.hash() and SHA-256 produce different values for
   * the same bytes. A cache entry written by Bun would always fail
   * verification when read by Node and vice versa, silently evicting every
   * cached entry on the first read in a mixed-runtime environment (e.g. Bun
   * dev-server writing, Node CI reading).
   */
  // oxlint-disable-next-line eslint/class-methods-use-this
  computeHash(bytes: Buffer): string {
    const bunGlobal = (globalThis as Record<string, unknown>).Bun as
      | { hash: (data: Uint8Array) => number | bigint }
      | undefined;
    if (bunGlobal) {
      return `${HASH_PREFIX_BUN}${bunGlobal.hash(bytes).toString(16)}`;
    }
    return `${HASH_PREFIX_SHA256}${createHash("sha256").update(bytes).digest("hex")}`;
  }

  /**
   * Returns true if `stored` and `computed` hashes are compatible —
   * i.e. both produced by the same algorithm. If they were produced by
   * different algorithms (cross-runtime read) this is a miss, not corruption.
   */
  // oxlint-disable-next-line eslint/class-methods-use-this
  private hashesMatch(stored: string, computed: string): boolean {
    const storedPrefix = stored.split(":")[0];
    const computedPrefix = computed.split(":")[0];

    if (storedPrefix !== computedPrefix) {
      // Cross-runtime: different algorithm. Treat as a cache miss, not
      // corruption — log at debug level, not warn, because it's expected
      // on first read after a runtime switch.
      logDebug(
        "FsStore: cross-runtime hash algorithm mismatch, treating as cache miss",
        { computed: computedPrefix, stored: storedPrefix }
      );
      return false;
    }

    return stored === computed;
  }

  /**
   * Writes `bytes` to `filePath` atomically.
   */
  async writeAtomic(filePath: string, bytes: Buffer): Promise<void> {
    const doWrite = () => this.fs.writeFileAtomic(filePath, bytes);
    await (this.limiter ? this.limiter.run(doWrite) : doWrite());
  }

  /**
   * Reads `filePath` and verifies both size and content hash against the
   * expected values before returning it. Returns `null` on any mismatch or
   * missing-file condition. Throws on genuine I/O errors.
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

    let fileStat;
    try {
      fileStat = await this.fs.stat(filePath);
    } catch (error: unknown) {
      if (isFsNotFoundError(error)) {
        logDebug("FsStore: file disappeared before stat (TOCTOU)", {
          filePath,
        });
        return null;
      }
      throw error;
    }

    if (fileStat.size !== expectedSizeBytes) {
      logWarn("FsStore: size mismatch on read, treating as corrupt", {
        expected: expectedSizeBytes,
        filePath,
        onDisk: fileStat.size,
      });
      return null;
    }

    let bytes;
    try {
      bytes = await this.fs.readFile(filePath);
    } catch (error: unknown) {
      if (isFsNotFoundError(error)) {
        logDebug("FsStore: file disappeared before readFile (TOCTOU)", {
          filePath,
        });
        return null;
      }
      throw error;
    }

    const actualHash = this.computeHash(bytes);
    if (!this.hashesMatch(expectedContentHash, actualHash)) {
      // Only log as corruption if both sides agree on the algorithm.
      // Cross-algorithm mismatches are logged at debug level inside hashesMatch.
      if (
        expectedContentHash.split(":")[0] === actualHash.split(":")[0]
      ) {
        logWarn("FsStore: content-hash mismatch on read, treating as corrupt", {
          expected: expectedContentHash,
          filePath,
        });
      }
      return null;
    }

    return bytes;
  }

  /**
   * Removes a cache entry's file if present. Returns the number of bytes
   * freed. Tolerant of the file already being gone.
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
