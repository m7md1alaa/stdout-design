import type { Preset } from "../shared/types.js";

export interface MatrixCell {
  rowIndex: number;
  rowKey: string;
  locale: string;
  preset: Pick<Preset, "id" | "width" | "height">;
  props: Record<string, unknown>;
}

export interface ManifestEntry {
  rowIndex: number;
  locale: string;
  preset: string;
  outputPath: string;
  cacheHit: boolean;
}

export interface Manifest {
  status: "completed" | "aborted";
  completedCount: number;
  totalCount: number;
  succeeded: ManifestEntry[];
  failed: {
    rowIndex: number;
    locale: string;
    preset: string;
    error: string;
  }[];
}
