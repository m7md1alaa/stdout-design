import { useEffect, useRef, useState } from "react";

import { API_ROUTES } from "../constants";

interface CanvasProps {
  templateId: string | null;
  props: Record<string, unknown>;
  preset: {
    id: string;
    width: number;
    height: number;
    platform: string;
  } | null;
  /**
   * Bumped whenever the dev server reports that this template's source
   * changed (see useSSE in App.tsx). Folded into the dedup key below so a
   * hot-reload triggers a re-fetch even when templateId/props/preset are
   * byte-for-byte unchanged -- without this, editing a template's JSX
   * (with no prop panel changes) would never refresh the preview.
   */
  reloadToken: number;
}

interface RenderState {
  url: string;
  status: "loading" | "loaded" | "error";
}

const RenderContent = ({ state }: { state: RenderState | null }) => {
  if (!state) {
    return null;
  }

  if (state.status === "loading") {
    return <div className="canvas-loading">Rendering...</div>;
  }

  if (state.status === "error") {
    return <div className="canvas-error">Render failed</div>;
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
  reloadToken,
}: CanvasProps) => {
  const [render, setRender] = useState<RenderState | null>(null);
  const lastKeyRef = useRef("");
  // Tracks the most recently created object URL so it can be revoked the
  // moment it's replaced or the component unmounts -- otherwise every
  // render leaks one blob URL for the life of the tab.
  const currentUrlRef = useRef<string | null>(null);

  useEffect(() => {
    if (!(templateId && preset)) {
      setRender(null);
      return;
    }

    const controller = new AbortController();
    const key = `${templateId}-${JSON.stringify(props)}-${preset.id}-${reloadToken}`;

    if (key === lastKeyRef.current) {
      return;
    }

    const timer = setTimeout(async () => {
      lastKeyRef.current = key;
      setRender({ status: "loading", url: "" });

      try {
        const response = await fetch(API_ROUTES.render, {
          body: JSON.stringify({
            preset: preset.id,
            props,
            templateId,
          }),
          headers: { "Content-Type": "application/json" },
          method: "POST",
          signal: controller.signal,
        });

        if (!response.ok) {
          setRender({ status: "error", url: "" });
          return;
        }

        const blob = await response.blob();
        const url = URL.createObjectURL(blob);

        if (currentUrlRef.current) {
          URL.revokeObjectURL(currentUrlRef.current);
        }
        currentUrlRef.current = url;

        setRender({ status: "loaded", url });
      } catch {
        if (!controller.signal.aborted) {
          setRender({ status: "error", url: "" });
        }
      }
    }, 200);

    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [templateId, props, preset, reloadToken]);

  // Revoke the last blob URL on unmount too, not just on replacement.
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
      <div className="canvas-empty">
        <p>Select a template to preview</p>
      </div>
    );
  }

  const scale = Math.min(1, 800 / preset.width, 600 / preset.height);
  const displayWidth = Math.round(preset.width * scale);
  const displayHeight = Math.round(preset.height * scale);

  return (
    <div className="canvas-container">
      <div className="canvas-info">
        <span className="canvas-preset-label">{preset.id}</span>
        <span className="canvas-dimensions">
          {preset.width}&times;{preset.height}
        </span>
      </div>
      <div
        className="canvas-preview"
        style={{ height: displayHeight, width: displayWidth }}
      >
        <RenderContent state={render} />
      </div>
    </div>
  );
};
