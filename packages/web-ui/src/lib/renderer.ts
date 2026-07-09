export type RenderResult =
  | { ok: true; blob: Blob }
  | { ok: false; error: string };

export interface RenderAdapter {
  render: (
    templateId: string,
    props: Record<string, unknown>,
    options?: {
      locale?: string;
      preset?: string;
      signal?: AbortSignal;
    }
  ) => Promise<RenderResult>;
}
