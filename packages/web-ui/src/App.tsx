import { useState, useCallback } from "react";

import { Canvas } from "./components/canvas";
import { ErrorBoundary } from "./components/error-boundary";
import { PropPanel } from "./components/prop-panel";
import { TemplateSelector } from "./components/template-selector";
import { API_BASE } from "./constants";
import { useSSE } from "./hooks/use-sse";
import type { SSEReloadEvent } from "./hooks/use-sse";
import { useTemplates } from "./hooks/use-templates";
import type { TemplateSchema } from "./hooks/use-templates";
import { createHttpRenderAdapter } from "./lib/http-render-adapter";
import type { RenderAdapter } from "./lib/renderer";

import "./app.css";

const renderAdapter: RenderAdapter = createHttpRenderAdapter(API_BASE);

const computeDefaultProps = (
  template: TemplateSchema | undefined
): Record<string, unknown> => {
  const defaults: Record<string, unknown> = {};
  const properties = (
    template?.propsSchema as {
      properties?: Record<string, { type?: string; default?: unknown }>;
    }
  )?.properties;
  if (!properties) {
    return defaults;
  }

  for (const [key, prop] of Object.entries(properties)) {
    if ("default" in prop && prop.default !== undefined) {
      defaults[key] = prop.default;
    } else if (prop.type === "string") {
      defaults[key] = "";
    } else if (prop.type === "number") {
      defaults[key] = 0;
    } else if (prop.type === "boolean") {
      defaults[key] = false;
    } else if (prop.type === "array") {
      defaults[key] = [];
    }
  }
  return defaults;
};

const App = () => {
  const { templates, presets, defaultPreset, loading, error, reload } =
    useTemplates();

  const [selectedTemplate, setSelectedTemplate] = useState<string | null>(null);
  const [selectedPreset, setSelectedPreset] = useState<string | null>(null);
  const [propValues, setPropValues] = useState<Record<string, unknown>>({});
  // Bumped on every SSE "template" event for the currently selected
  // template. This -- not propValues identity churn -- is the real signal
  // Canvas uses to know a hot-reloaded template needs re-fetching even
  // when no prop value actually changed.
  const [reloadToken, setReloadToken] = useState(0);

  const effectiveTemplateId = selectedTemplate ?? templates[0]?.id ?? null;
  const effectivePresetId =
    selectedPreset ?? defaultPreset ?? presets[0]?.id ?? null;

  const currentTemplate = templates.find((t) => t.id === effectiveTemplateId);
  const currentPreset = presets.find((p) => p.id === effectivePresetId) ?? null;

  useSSE(
    useCallback(
      (event: SSEReloadEvent) => {
        if (event.type === "full") {
          reload();
          setReloadToken((t) => t + 1);
        }
        if (
          event.type === "template" &&
          event.templateId === effectiveTemplateId
        ) {
          setReloadToken((t) => t + 1);
        }
      },
      [reload, effectiveTemplateId]
    )
  );

  const handleTemplateChange = useCallback(
    (id: string) => {
      const template = templates.find((t) => t.id === id);
      setSelectedTemplate(id);
      setPropValues(computeDefaultProps(template));
    },
    [templates]
  );

  const handlePropChange = useCallback((path: string, value: unknown) => {
    setPropValues((prev) => ({ ...prev, [path]: value }));
  }, []);

  const handleExport = useCallback(async () => {
    if (!(effectiveTemplateId && effectivePresetId)) {
      return;
    }

    const result = await renderAdapter.render(effectiveTemplateId, propValues, {
      preset: effectivePresetId,
    });

    if (!result.ok) {
      return;
    }

    const url = URL.createObjectURL(result.blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${effectiveTemplateId}-${effectivePresetId}.png`;
    a.click();
    // Safe to revoke immediately after a synchronous click() triggers the
    // download -- unlike Canvas's preview URL, this one has no ongoing
    // <img> consumer that needs it to stay alive.
    URL.revokeObjectURL(url);
  }, [effectiveTemplateId, effectivePresetId, propValues]);

  if (loading) {
    return (
      <div className="app-loading">
        <p>Loading studio...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="app-error">
        <p>Couldn&apos;t load the studio: {error}</p>
        <button type="button" onClick={() => reload()}>
          Retry
        </button>
      </div>
    );
  }

  return (
    <ErrorBoundary>
      <div className="app">
        <aside className="sidebar">
          <div className="sidebar-header">
            <h1 className="sidebar-title">stdout</h1>
            <span className="sidebar-subtitle">studio</span>
          </div>

          <TemplateSelector
            templates={templates}
            selected={effectiveTemplateId}
            onChange={handleTemplateChange}
          />

          {currentTemplate ? (
            <PropPanel
              schema={currentTemplate.propsSchema}
              values={propValues}
              onChange={handlePropChange}
            />
          ) : (
            <div className="no-template">Select a template to begin</div>
          )}

          <div className="sidebar-actions">
            <button
              type="button"
              className="btn-export"
              onClick={handleExport}
              disabled={!effectiveTemplateId || !currentPreset}
            >
              Export PNG
            </button>
          </div>
        </aside>

        <main className="main">
          <div className="preset-tabs">
            {presets.map((preset) => (
              <button
                key={preset.id}
                type="button"
                className={`preset-tab ${effectivePresetId === preset.id ? "active" : ""}`}
                onClick={() => {
                  setSelectedPreset(preset.id);
                }}
              >
                <span className="preset-tab-name">{preset.id}</span>
                <span className="preset-tab-dims">
                  {preset.width}&times;{preset.height}
                </span>
              </button>
            ))}
          </div>

          <Canvas
            templateId={effectiveTemplateId}
            props={propValues}
            preset={currentPreset}
            reloadToken={reloadToken}
            renderAdapter={renderAdapter}
          />
        </main>
      </div>
    </ErrorBoundary>
  );
};

export default App;
