import { useMemo, useState } from "react";

import { Button } from "@/components/ui/button";
import { ToastProvider } from "@/components/ui/toast";

import { useAppCommands } from "./commands/use-app-commands";
import { CommandPalette } from "./components/command-palette";
import { ErrorBoundary } from "./components/error-boundary";
import { ShortcutsDialog } from "./components/shortcuts-dialog";
import { StudioCanvasPanel } from "./components/studio-canvas-panel";
import { StudioSidebar } from "./components/studio-sidebar";
import { StudioToolbar } from "./components/studio-toolbar";
import { API_BASE } from "./constants";
import { useCanvasView } from "./hooks/use-canvas-view";
import { useExport } from "./hooks/use-export";
import { useRenderPreview } from "./hooks/use-render-preview";
import { useStudioState } from "./hooks/use-studio-state";
import { useTemplates } from "./hooks/use-templates";
import { createHttpRenderAdapter } from "./lib/http-render-adapter";
import type { RenderAdapter } from "./lib/renderer";
import { resolveCompareLocale } from "./lib/view-mode";
import type { ViewMode } from "./lib/view-mode";

const renderAdapter: RenderAdapter = createHttpRenderAdapter(API_BASE);

const App = () => {
  const {
    templates,
    presets,
    locales,
    localeInfo,
    defaultPreset,
    initialLoading,
    reloading,
    error,
    reload,
  } = useTemplates();

  const studio = useStudioState({
    defaultPreset,
    localeInfo,
    presets,
    reload,
    templates,
  });

  const presetIds = useMemo(() => presets.map((p) => p.id), [presets]);

  const [requestedMode, setRequestedMode] = useState<ViewMode>("single");
  const [pickedCompareLocale, setPickedCompareLocale] = useState<string | null>(
    null
  );
  const mode =
    requestedMode === "compare" && locales.length < 2
      ? "single"
      : requestedMode;
  const compareLocale = resolveCompareLocale(
    pickedCompareLocale,
    studio.effectiveLocale,
    locales
  );

  const renderInput = {
    autoDetected: studio.autoDetected,
    locale: studio.effectiveLocale,
    localeOverrides: studio.currentOverrides,
    preset: studio.currentPreset,
    props: studio.propValues,
    reloadToken: studio.reloadToken,
    templateId: studio.effectiveTemplateId,
  };
  const render = useRenderPreview(
    renderInput,
    renderAdapter,
    studio.handleRenderIssues
  );
  const view = useCanvasView(studio.currentPreset);

  const exportFlow = useExport({
    autoDetected: studio.autoDetected,
    effectiveLocale: studio.effectiveLocale,
    effectivePresetId: studio.effectivePresetId,
    effectiveTemplateId: studio.effectiveTemplateId,
    localeOverrides: studio.currentOverrides,
    onRenderIssues: studio.handleRenderIssues,
    presetIds,
    propValues: studio.propValues,
    renderAdapter,
    selectedLocale: studio.selectedLocale,
    templateOverrides: studio.templateOverrides,
  });

  const shortcuts = useAppCommands({
    canCopyShareLink: () => Boolean(studio.effectiveTemplateId),
    canExport: () =>
      Boolean(studio.effectiveTemplateId && studio.currentPreset),
    canResetProps: () => studio.hasEdits,
    copyShareLink: exportFlow.handleCopyShareLink,
    exportPng: exportFlow.handleExport,
    resetProps: studio.handleResetProps,
    zoomActual: view.setActualSize,
    zoomFit: view.setFit,
    zoomIn: view.zoomIn,
    zoomOut: view.zoomOut,
  });

  if (initialLoading) {
    return (
      <div className="text-muted-foreground flex h-screen items-center justify-center">
        <p>Loading studio...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-muted-foreground flex h-screen flex-col items-center justify-center gap-4">
        <p>Couldn&apos;t load the studio: {error}</p>
        <Button onClick={() => reload()} variant="link">
          Retry
        </Button>
      </div>
    );
  }

  return (
    <ToastProvider>
      <ErrorBoundary>
        <div className="flex h-screen flex-col overflow-hidden">
          <StudioToolbar
            exportFlow={exportFlow}
            locales={locales}
            presets={presets}
            compareLocale={compareLocale}
            mode={mode}
            onCompareLocaleChange={setPickedCompareLocale}
            onModeChange={setRequestedMode}
            rendering={reloading || render?.status === "loading"}
            shortcuts={shortcuts}
            studio={studio}
            templates={templates}
          />
          <div className="flex min-h-0 flex-1">
            <StudioCanvasPanel
              compareLocale={compareLocale}
              hasTemplate={Boolean(studio.effectiveTemplateId)}
              input={renderInput}
              mode={mode}
              overridesFor={studio.overridesFor}
              onSelectPreset={(id) => {
                studio.setSelectedPreset(id);
                setRequestedMode("single");
              }}
              preset={studio.currentPreset}
              presets={presets}
              render={render}
              renderAdapter={renderAdapter}
              view={view}
            />
            <StudioSidebar studio={studio} />
          </div>
        </div>

        <CommandPalette
          commands={shortcuts.commands}
          currentTemplateId={studio.effectiveTemplateId}
          onOpenChange={shortcuts.handlePaletteOpenChange}
          onSelectTemplate={studio.handleTemplateChange}
          open={shortcuts.isPaletteOpen}
          resolveBinding={shortcuts.bindings.resolve}
          templates={templates}
        />

        <ShortcutsDialog
          commands={shortcuts.commands}
          isCustomized={shortcuts.bindings.isCustomized}
          onOpenChange={shortcuts.handleShortcutsOpenChange}
          open={shortcuts.isShortcutsOpen}
          recordingIds={shortcuts.recordingIds}
          resetBinding={shortcuts.bindings.resetBinding}
          resolveBinding={shortcuts.bindings.resolve}
          setBinding={shortcuts.bindings.setBinding}
          setRowRecording={shortcuts.setRowRecording}
        />
      </ErrorBoundary>
    </ToastProvider>
  );
};

export default App;
