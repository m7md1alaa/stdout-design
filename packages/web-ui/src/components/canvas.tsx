import type { RenderPreviewState } from "../hooks/use-render-preview";
import { useRenderPreview } from "../hooks/use-render-preview";
import type { RenderAdapter, ValidationIssue } from "../lib/renderer";

interface CanvasProps {
  templateId: string | null;
  props: Record<string, unknown>;
  preset: {
    id: string;
    width: number;
    height: number;
    platform: string;
  } | null;
  locale: string | null;
  autoDetected: boolean;
  reloadToken: number;
  renderAdapter: RenderAdapter;
  onRenderIssues: (issues: ValidationIssue[]) => void;
}

const RenderContent = ({ state }: { state: RenderPreviewState | null }) => {
  if (!state) {
    return null;
  }

  if (state.status === "loading") {
    return <div className="text-content-tertiary text-sm">Rendering...</div>;
  }

  if (state.status === "error") {
    return (
      <div className="text-danger p-4 text-left">
        <p className="mb-2 text-sm font-semibold">
          {state.message || "Render failed"}
        </p>
        {state.issues && state.issues.length > 0 ? (
          <ul className="m-0 list-disc pl-4 text-xs leading-relaxed">
            {state.issues.map((issue, i) => (
              <li key={i}>
                <strong>{issue.path}</strong>: {issue.message}
              </li>
            ))}
          </ul>
        ) : null}
      </div>
    );
  }

  if (state.url) {
    return (
      <img
        src={state.url}
        alt="Preview"
        style={{ height: "100%", width: "100%" }}
      />
    );
  }

  return null;
};

export const Canvas = ({
  templateId,
  props,
  preset,
  locale,
  autoDetected,
  reloadToken,
  renderAdapter,
  onRenderIssues,
}: CanvasProps) => {
  const render = useRenderPreview(
    { autoDetected, locale, preset, props, reloadToken, templateId },
    renderAdapter,
    onRenderIssues
  );

  if (!(templateId && preset)) {
    return (
      <div className="text-content-tertiary flex flex-1 items-center justify-center">
        <p>Select a template to preview</p>
      </div>
    );
  }

  const scale = Math.min(1, 800 / preset.width, 600 / preset.height);
  const displayWidth = Math.round(preset.width * scale);
  const displayHeight = Math.round(preset.height * scale);

  return (
    <div className="flex flex-1 flex-col items-center justify-center overflow-auto p-6">
      <div className="mb-4 flex items-center gap-3">
        <span className="text-content-secondary font-mono text-sm font-semibold">
          {preset.id}
        </span>
        <span className="text-content-tertiary font-mono text-xs">
          {preset.width}&times;{preset.height}
        </span>
      </div>
      <div
        className="bg-surface-tertiary flex items-center justify-center overflow-hidden rounded-lg shadow-[0_4px_24px_rgba(0,0,0,0.4)]"
        style={{ height: displayHeight, width: displayWidth }}
      >
        <RenderContent state={render} />
      </div>
    </div>
  );
};
