import { useState, useCallback, useEffect } from "react";

import { Canvas } from "./components/canvas";
import { PropPanel } from "./components/prop-panel";
import { TemplateSelector } from "./components/template-selector";
import { API_ROUTES } from "./constants";
import { useSSE } from "./hooks/use-sse";
import type { SSEReloadEvent } from "./hooks/use-sse";
import { useTemplates } from "./hooks/use-templates";

import "./App.css";

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

  const currentTemplate = templates.find((t) => t.id === selectedTemplate);

  useSSE(
    useCallback(
      (event: SSEReloadEvent) => {
        if (event.type === "full") {
          reload();
          setReloadToken((t) => t + 1);
        }
        if (
          event.type === "template" &&
          event.templateId === selectedTemplate
        ) {
          setReloadToken((t) => t + 1);
        }
      },
      [reload, selectedTemplate]
    )
  );

  useEffect(() => {
    const first = templates?.[0];
    if (first && !selectedTemplate) {
      setSelectedTemplate(first.id);
    }
  }, [templates, selectedTemplate]);

  useEffect(() => {
    const first = presets?.[0];
    if (first && !selectedPreset) {
      setSelectedPreset(defaultPreset ?? first.id);
    }
  }, [presets, defaultPreset, selectedPreset]);

  const handleTemplateChange = useCallback((id: string) => {
    setSelectedTemplate(id);
    setPropValues({});
  }, []);

  const handlePropChange = useCallback((path: string, value: unknown) => {
    setPropValues((prev) => ({ ...prev, [path]: value }));
  }, []);

  const currentPreset = presets.find((p) => p.id === selectedPreset) ?? null;

  const handleExport = useCallback(async () => {
    if (!(selectedTemplate && currentPreset)) {
      return;
    }

    const response = await fetch(API_ROUTES.render, {
      body: JSON.stringify({
        preset: currentPreset.id,
        props: propValues,
        templateId: selectedTemplate,
      }),
      headers: { "Content-Type": "application/json" },
      method: "POST",
    });

    if (!response.ok) {
      return;
    }

    const blob = await response.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${selectedTemplate}-${currentPreset.id}.png`;
    a.click();
    // Safe to revoke immediately after a synchronous click() triggers the
    // download -- unlike Canvas's preview URL, this one has no ongoing
    // <img> consumer that needs it to stay alive.
    URL.revokeObjectURL(url);
  }, [selectedTemplate, currentPreset, propValues]);

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
        <p>Couldn't load the studio: {error}</p>
        <button type="button" onClick={() => reload()}>
          Retry
        </button>
      </div>
    );
  }

  return (
    <div className="app">
      <aside className="sidebar">
        <div className="sidebar-header">
          <h1 className="sidebar-title">stdout</h1>
          <span className="sidebar-subtitle">studio</span>
        </div>

        <TemplateSelector
          templates={templates}
          selected={selectedTemplate}
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
            disabled={!selectedTemplate || !currentPreset}
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
              className={`preset-tab ${selectedPreset === preset.id ? "active" : ""}`}
              onClick={() => setSelectedPreset(preset.id)}
            >
              <span className="preset-tab-name">{preset.id}</span>
              <span className="preset-tab-dims">
                {preset.width}&times;{preset.height}
              </span>
            </button>
          ))}
        </div>

        <Canvas
          templateId={selectedTemplate}
          props={propValues}
          preset={currentPreset}
          reloadToken={reloadToken}
        />
      </main>
    </div>
  );
};

export default App;
