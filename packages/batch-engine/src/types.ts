import type {
  CompiledTemplate,
  Preset,
  RenderCache,
} from "@stdout-design/core";

export type OutputFormat = "webp" | "png" | "jpeg" | "ico" | "raw";

export interface MatrixCell {
  rowIndex: number;
  rowKey: string;
  locale: string;
  preset: Pick<Preset, "id" | "width" | "height">;
  props: Record<string, unknown>;
}

export interface RenderOneInput {
  compiledTemplate: CompiledTemplate;
  templateId: string;
  contentHash: string;
  props: Record<string, unknown>;
  width: number;
  height: number;
  format?: OutputFormat;
  cache: RenderCache;
  outDir: string;
  filename: string;
  signal?: AbortSignal;
}

export interface RenderOneOutput {
  outputPath: string;
  cacheHit: boolean;
  durationMs: number;
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
