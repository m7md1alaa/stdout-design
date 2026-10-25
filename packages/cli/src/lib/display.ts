import path from "node:path";

import type { CacheStats, Manifest } from "@stdout-design/core";

const formatBytes = (bytes: number): string => {
  if (bytes < 1024) {
    return `${bytes} B`;
  }
  if (bytes < 1024 * 1024) {
    return `${(bytes / 1024).toFixed(1)} KB`;
  }
  if (bytes < 1024 * 1024 * 1024) {
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  }
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`;
};

export const formatCacheStats = (stats: CacheStats): string => {
  const lines: string[] = [
    "",
    "Cache Statistics",
    "━━━━━━━━━━━━━━━━",
    `  Location:    ${stats.cacheDir}`,
    `  Compiled:    ${stats.compiled.entries} entries (in-memory compile cache)`,
    `  Pixel:       ${stats.pixels.entries} entries`,
    `  Disk used:   ${formatBytes(stats.pixels.sizeBytes)}`,
    `  Disk limit:  ${formatBytes(stats.pixels.maxSizeBytes)}`,
    "",
  ];

  return lines.join("\n");
};

const MAX_LISTED_FILES = 10;

const plural = (count: number, word: string): string =>
  `${count} ${word}${count === 1 ? "" : "s"}`;

export const formatManifestSummary = (
  manifest: Manifest,
  cwd?: string
): string => {
  const { totalCount, succeeded, failed } = manifest;
  const cacheHits = succeeded.filter((s) => s.cacheHit).length;
  const display = (filePath: string): string =>
    cwd ? path.relative(cwd, filePath) || filePath : filePath;

  const lines: string[] = [""];

  if (succeeded.length > 0) {
    const cached = cacheHits > 0 ? ` (${cacheHits} from cache)` : "";
    lines.push(
      `✓ Rendered ${plural(succeeded.length, "image")} of ${totalCount}${cached}`
    );
    for (const entry of succeeded.slice(0, MAX_LISTED_FILES)) {
      lines.push(`  ${display(entry.outputPath)}`);
    }
    const hidden = succeeded.length - MAX_LISTED_FILES;
    if (hidden > 0) {
      lines.push(
        `  … and ${hidden} more (see manifest.json in the output dir)`
      );
    }
    lines.push("");
  }

  if (failed.length > 0) {
    lines.push(`✗ ${plural(failed.length, "render")} failed:`);
    for (const f of failed) {
      lines.push(`  [${f.preset}, ${f.locale}, row ${f.rowIndex}] ${f.error}`);
    }
    lines.push("");
  }

  if (manifest.status === "aborted") {
    const skipped = totalCount - succeeded.length - failed.length;
    lines.push(
      `Batch aborted after the first failure (--fail-fast); ${skipped} skipped.`,
      ""
    );
  }

  if (totalCount === 0) {
    lines.push("Nothing to render — the data file has no rows.", "");
  }

  return lines.join("\n");
};

export const formatError = (error?: unknown): string => {
  if (error instanceof Error) {
    return `Error: ${error.message}`;
  }
  return `Error: ${String(error)}`;
};

export const formatCacheCleanResult = (freedBytes: number): string =>
  `Cache cleared. Freed ${formatBytes(freedBytes)}.`;
