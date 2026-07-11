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
import type { RenderAdapter, ValidationIssue } from "./lib/renderer";
import { setNestedValue } from "./lib/utils";

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

  for (const key of Object.keys(properties)) {
    const prop = properties[key];
    if (!prop) {
      continue;
    }

    if (prop.type === "object" && prop.properties) {
      const nested = computeDefaultProps({
        contentHash: "",
        description: "",
        id: "",
        propsSchema: { properties: prop.properties },
      });
      if (Object.keys(nested).length > 0) {
        defaults[key] = nested;
      }
    } else if ("default" in prop && prop.default !== undefined) {
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
  const {
    templates,
    presets,
    defaultPreset,
    initialLoading,
    reloading,
    error,
    reload,
  } = useTemplates();

  const [selectedTemplate, setSelectedTemplate] = useState<string | null>(null);
  const [selectedPreset, setSelectedPreset] = useState<string | null>(null);
  const [propStore, setPropStore] = useState<
    Record<string, Record<string, unknown>>
  >({});
  const [reloadToken, setReloadToken] = useState(0);
  const [exportError, setExportError] = useState<string | null>(null);
  const [validationErrors, setValidationErrors] = useState<
    Record<string, string>
  >({});

  const effectiveTemplateId = selectedTemplate ?? templates[0]?.id ?? null;
  const effectivePresetId =
    selectedPreset ?? defaultPreset ?? presets[0]?.id ?? null;

  const currentTemplate = templates.find((t) => t.id === effectiveTemplateId);
  const currentPreset = presets.find((p) => p.id === effectivePresetId) ?? null;

  const propValues = effectiveTemplateId
    ? (propStore[effectiveTemplateId] ?? computeDefaultProps(currentTemplate))
    : {};

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

  const handleTemplateChange = (id: string) => {
    if (effectiveTemplateId) {
      setPropStore((prev) => ({
        ...prev,
        [effectiveTemplateId]: prev[effectiveTemplateId],
      }));
    }

    setSelectedTemplate(id);
    setValidationErrors({});

    if (!propStore[id]) {
      const template = templates.find((t) => t.id === id);
      setPropStore((prev) => ({
        ...prev,
        [id]: computeDefaultProps(template),
      }));
    }
  };

  const handlePropChange = useCallback(
    (path: string, value: unknown) => {
      if (!effectiveTemplateId) {
        return;
      }
      setPropStore((prev) => ({
        ...prev,
        [effectiveTemplateId]: setNestedValue(
          prev[effectiveTemplateId] ?? {},
          path,
          value
        ),
      }));
      setValidationErrors((prev) => {
        const { [path]: _removed, ...rest } = prev;
        return rest;
      });
    },
    [effectiveTemplateId]
  );

  const handleRenderIssues = useCallback((issues: ValidationIssue[]) => {
    const errorMap: Record<string, string> = {};
    for (const issue of issues) {
      errorMap[issue.path] = issue.message;
    }
    setValidationErrors(errorMap);
  }, []);

  const handleExport = async () => {
    if (!(effectiveTemplateId && effectivePresetId)) {
      return;
    }

    setExportError(null);

    const result = await renderAdapter.render(effectiveTemplateId, propValues, {
      preset: effectivePresetId,
    });

    if (!result.ok) {
      setExportError(result.error);
      if (result.issues) {
        handleRenderIssues(result.issues);
      }
      return;
    }

    const url = URL.createObjectURL(result.blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${effectiveTemplateId}-${effectivePresetId}.png`;
    a.click();
    URL.revokeObjectURL(url);
  };

  if (initialLoading) {
    return (
      <div className="flex h-screen items-center justify-center text-content-tertiary">
        <p>Loading studio...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex h-screen flex-col items-center justify-center gap-4 text-content-tertiary">
        <p>Couldn&apos;t load the studio: {error}</p>
        <button
          type="button"
          className="cursor-pointer text-accent hover:text-accent-hover"
          onClick={() => reload()}
        >
          Retry
        </button>
      </div>
    );
  }

  return (
    <ErrorBoundary>
      <div className="flex h-screen overflow-hidden">
        <aside className="flex w-sidebar min-w-sidebar flex-col overflow-y-auto border-r border-border bg-surface-secondary">
          <div className="flex items-baseline gap-2 border-b border-border px-5 py-5 pb-4">
            <h1 className="text-lg font-bold tracking-tight text-content">
              stdout
            </h1>
            <span className="text-sm font-normal text-content-tertiary">
              studio
            </span>
            {reloading ? (
              <span className="ml-auto h-3 w-3 animate-pulse rounded-full bg-accent" />
            ) : null}
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
              errors={validationErrors}
              onChange={handlePropChange}
            />
          ) : (
            <div className="px-5 py-10 text-center text-content-tertiary">
              Select a template to begin
            </div>
          )}

          <div className="border-t border-border px-5 py-4">
            <button
              type="button"
              className="w-full cursor-pointer rounded-sm bg-accent px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-accent-hover disabled:cursor-not-allowed disabled:opacity-40"
              onClick={handleExport}
              disabled={!effectiveTemplateId || !currentPreset}
            >
              Export PNG
            </button>
            {exportError ? (
              <div className="mt-2 flex items-start gap-2 rounded-sm border border-red-500/30 bg-red-500/10 p-2">
                <p className="flex-1 text-sm text-danger">{exportError}</p>
                <button
                  type="button"
                  className="cursor-pointer border-none bg-none p-0 text-lg leading-none text-danger opacity-60 hover:opacity-100"
                  onClick={() => setExportError(null)}
                >
                  &times;
                </button>
              </div>
            ) : null}
          </div>
        </aside>

        <main className="flex flex-1 flex-col overflow-hidden">
          <div className="flex overflow-x-auto border-b border-border bg-surface-secondary">
            {presets.map((preset) => (
              <button
                key={preset.id}
                type="button"
                className={`flex cursor-pointer flex-col items-center gap-0.5 whitespace-nowrap border-none bg-none px-4 py-2.5 text-content-tertiary transition-colors hover:text-content-secondary ${effectivePresetId === preset.id ? "border-b-2 border-accent text-accent" : "border-b-2 border-transparent"}`}
                onClick={() => {
                  setSelectedPreset(preset.id);
                }}
              >
                <span className="text-xs font-semibold">{preset.id}</span>
                <span className="font-mono text-[10px] text-content-tertiary">
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
            onRenderIssues={handleRenderIssues}
          />
        </main>
      </div>
    </ErrorBoundary>
  );
};

export default App;
