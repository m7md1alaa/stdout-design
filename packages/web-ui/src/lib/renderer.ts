export interface ValidationIssue {
  path: string;
  message: string;
  code?: string;
}

type RenderResult =
  | { ok: true; blob: Blob }
  | { ok: false; error: string; issues?: ValidationIssue[] };

export interface RenderAdapter {
  render: (
    templateId: string,
    props: Record<string, unknown>,
    options?: {
      autoDetected?: boolean;
      locale?: string;
      preset?: string;
      signal?: AbortSignal;
    }
  ) => Promise<RenderResult>;
}
