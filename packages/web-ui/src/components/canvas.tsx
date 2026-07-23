import { useEffect, useRef, useState } from "react";

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

interface RenderState {
  url: string;
  status: "loading" | "loaded" | "error";
  issues?: ValidationIssue[];
  message?: string;
}

const RenderContent = ({ state }: { state: RenderState | null }) => {
  if (!state) {
    return null;
  }

  if (state.status === "loading") {
    return <div className="text-sm text-content-tertiary">Rendering...</div>;
  }

  if (state.status === "error") {
    return (
      <div className="p-4 text-left text-danger">
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
  const [render, setRender] = useState<RenderState | null>(null);
  const lastKeyRef = useRef("");
  const currentUrlRef = useRef<string | null>(null);
  const onRenderIssuesRef = useRef(onRenderIssues);

  useEffect(() => {
    onRenderIssuesRef.current = onRenderIssues;
  }, [onRenderIssues]);

  useEffect(() => {
    if (!(templateId && preset)) {
      return;
    }

    const controller = new AbortController();
    const key = `${templateId}-${JSON.stringify(props)}-${preset.id}-${locale ?? "none"}-${autoDetected}-${reloadToken}`;

    if (key === lastKeyRef.current) {
      return;
    }

    const timer = setTimeout(async () => {
      lastKeyRef.current = key;
      setRender({ status: "loading", url: "" });
      onRenderIssuesRef.current([]);

      const result = await renderAdapter.render(templateId, props, {
        autoDetected,
        locale: locale ?? undefined,
        preset: preset.id,
        signal: controller.signal,
      });

      if (!result.ok) {
        if (controller.signal.aborted) {
          return;
        }
        setRender({
          issues: result.issues,
          message: result.error,
          status: "error",
          url: "",
        });
        if (result.issues) {
          onRenderIssuesRef.current(result.issues);
        }
        return;
      }

      const url = URL.createObjectURL(result.blob);

      if (currentUrlRef.current) {
        URL.revokeObjectURL(currentUrlRef.current);
      }
      currentUrlRef.current = url;

      setRender({ status: "loaded", url });
    }, 200);

    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [
    templateId,
    props,
    preset,
    locale,
    autoDetected,
    reloadToken,
    renderAdapter,
  ]);

  useEffect(
    () => () => {
      if (currentUrlRef.current) {
        URL.revokeObjectURL(currentUrlRef.current);
        currentUrlRef.current = null;
      }
    },
    []
  );

  if (!(templateId && preset)) {
    return (
      <div className="flex flex-1 items-center justify-center text-content-tertiary">
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
        <span className="font-mono text-sm font-semibold text-content-secondary">
          {preset.id}
        </span>
        <span className="font-mono text-xs text-content-tertiary">
          {preset.width}&times;{preset.height}
        </span>
      </div>
      <div
        className="flex items-center justify-center overflow-hidden rounded-lg bg-surface-tertiary shadow-[0_4px_24px_rgba(0,0,0,0.4)]"
        style={{ height: displayHeight, width: displayWidth }}
      >
        <RenderContent state={render} />
      </div>
    </div>
  );
};
