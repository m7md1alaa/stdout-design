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
    `  Stage A:     ${stats.stageA.entries} entries (in-memory compile cache)`,
    `  Stage B:     ${stats.stageB.entries} entries`,
    `  Disk used:   ${formatBytes(stats.stageB.sizeBytes)}`,
    `  Disk limit:  ${formatBytes(stats.stageB.maxSizeBytes)}`,
    "",
  ];

  return lines.join("\n");
};

export const formatManifestSummary = (manifest: Manifest): string => {
  const { completedCount, totalCount, succeeded, failed } = manifest;
  const cacheHits = succeeded.filter((s) => s.cacheHit).length;

  const lines: string[] = [
    "",
    "Batch Render Complete",
    "━━━━━━━━━━━━━━━━━━━━",
    `  Status:    ${manifest.status}`,
    `  Total:     ${totalCount}`,
    `  Completed: ${completedCount}`,
    `  Cache:     ${cacheHits} hits, ${succeeded.length - cacheHits} renders`,
    `  Failed:    ${failed.length}`,
    "",
  ];

  if (succeeded.length > 0 && succeeded.length <= 10) {
    lines.push("Output files:");
    for (const entry of succeeded) {
      lines.push(`  ${entry.outputPath}`);
    }
    lines.push("");
  }

  if (failed.length > 0) {
    lines.push("Failures:");
    for (const f of failed) {
      lines.push(`  Row ${f.rowIndex}, ${f.locale}, ${f.preset}: ${f.error}`);
    }
    lines.push("");
  }

  return lines.join("\n");
};

export const formatError = (error: unknown): string => {
  if (error instanceof Error) {
    return `Error: ${error.message}`;
  }
  return `Error: ${String(error)}`;
};

export const formatCacheCleanResult = (freedBytes: number): string =>
  `Cache cleared. Freed ${formatBytes(freedBytes)}.`;
