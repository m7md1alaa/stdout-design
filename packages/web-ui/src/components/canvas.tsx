import type { CanvasView } from "../hooks/use-canvas-view";
import type { RenderPreviewState } from "../hooks/use-render-preview";

interface CanvasProps {
  hasTemplate: boolean;
  preset: { id: string; width: number; height: number } | null;
  render: RenderPreviewState | null;
  view: CanvasView;
}

const RenderIssues = ({
  message,
  issues,
}: Pick<RenderPreviewState, "message" | "issues">) => (
  <div className="text-destructive-foreground" role="alert">
    <p className="text-sm font-semibold">{message || "Render failed"}</p>
    {issues && issues.length > 0 ? (
      <ul className="m-0 mt-2 list-disc pl-4 text-xs leading-relaxed">
        {issues.map((issue) => (
          <li key={`${issue.path}:${issue.message}`}>
            <strong>{issue.path}</strong>: {issue.message}
          </li>
        ))}
      </ul>
    ) : null}
  </div>
);

interface FrameProps {
  state: RenderPreviewState | null;
  width: number;
  height: number;
}

/**
 * The artwork. The last good frame stays in place while the next render is
 * in flight, so an edit never blanks the canvas: progress is a thin line
 * along the top, and a failed render reports over the frame instead of
 * replacing it. Before any render has finished the same line shows over an
 * empty frame.
 */
const Frame = ({ state, width, height }: FrameProps) => {
  const failed = state?.status === "error";
  const isLoading = !state || state.status === "loading";
  const url = state?.url ?? "";

  return (
    <div
      aria-busy={isLoading}
      className="bg-muted relative overflow-hidden rounded-lg shadow-[0_4px_24px_rgba(0,0,0,0.4)]"
      style={{ height, width }}
    >
      {url ? (
        <img
          alt="Preview"
          className="size-full object-contain"
          draggable={false}
          src={url}
        />
      ) : null}

      {failed && !url ? (
        <div className="flex size-full items-center justify-center overflow-auto p-4 text-left">
          <RenderIssues issues={state.issues} message={state.message} />
        </div>
      ) : null}

      {failed && url ? (
        <div className="border-destructive/40 bg-background/90 absolute inset-x-0 bottom-0 max-h-[60%] overflow-auto border-t p-3">
          <RenderIssues issues={state.issues} message={state.message} />
        </div>
      ) : null}

      {/* Appears after a beat, so a fast render doesn't flash it. */}
      <div
        aria-hidden="true"
        className="bg-foreground/60 absolute inset-x-0 top-0 h-0.5 animate-pulse opacity-0 transition-opacity duration-150 data-[loading=true]:opacity-100 data-[loading=true]:delay-200"
        data-loading={isLoading}
      />
    </div>
  );
};

export const Canvas = ({ hasTemplate, preset, render, view }: CanvasProps) => {
  const { areaRef, scale } = view;
  if (!(hasTemplate && preset)) {
    return (
      <div className="text-muted-foreground flex flex-1 items-center justify-center">
        <p>Select a template to preview</p>
      </div>
    );
  }

  const displayWidth = Math.round(preset.width * scale);
  const displayHeight = Math.round(preset.height * scale);

  // `m-auto` centers the frame while it fits and lets the area scroll once a
  // zoom makes it larger; `items-center` would clip the overflowing edges.
  return (
    <div
      className="bg-background flex min-h-0 min-w-0 flex-1 overflow-auto p-6"
      ref={areaRef}
    >
      <div className="m-auto shrink-0">
        <Frame height={displayHeight} state={render} width={displayWidth} />
      </div>
    </div>
  );
};
