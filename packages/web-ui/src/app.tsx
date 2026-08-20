import { Button } from "@/components/ui/button";
import { ToastProvider } from "@/components/ui/toast";

import { useAppCommands } from "./commands/use-app-commands";
import { CommandPalette } from "./components/command-palette";
import { ErrorBoundary } from "./components/error-boundary";
import { ShortcutsDialog } from "./components/shortcuts-dialog";
import { StudioCanvasPanel } from "./components/studio-canvas-panel";
import { StudioSidebar } from "./components/studio-sidebar";
import { API_BASE } from "./constants";
import { useExport } from "./hooks/use-export";
import { useStudioState } from "./hooks/use-studio-state";
import { useTemplates } from "./hooks/use-templates";
import { createHttpRenderAdapter } from "./lib/http-render-adapter";
import type { RenderAdapter } from "./lib/renderer";

const renderAdapter: RenderAdapter = createHttpRenderAdapter(API_BASE);

const App = () => {
  const {
    templates,
    presets,
    locales,
    defaultPreset,
    initialLoading,
    reloading,
    error,
    reload,
  } = useTemplates();

  const studio = useStudioState({
    defaultPreset,
    locales,
    presets,
    reload,
    templates,
  });

  const exportFlow = useExport({
    autoDetected: studio.autoDetected,
    effectiveLocale: studio.effectiveLocale,
    effectivePresetId: studio.effectivePresetId,
    effectiveTemplateId: studio.effectiveTemplateId,
    onRenderIssues: studio.handleRenderIssues,
    propValues: studio.propValues,
    renderAdapter,
    selectedLocale: studio.selectedLocale,
  });

  const shortcuts = useAppCommands({
    canCopyShareLink: () => Boolean(studio.effectiveTemplateId),
    canExport: () =>
      Boolean(studio.effectiveTemplateId && studio.currentPreset),
    canResetProps: () =>
      Boolean(
        studio.effectiveTemplateId &&
        studio.propStore[studio.effectiveTemplateId]
      ),
    copyShareLink: exportFlow.handleCopyShareLink,
    exportPng: exportFlow.handleExport,
    resetProps: studio.handleResetProps,
  });

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
        <Button onClick={() => reload()} variant="link">
          Retry
        </Button>
      </div>
    );
  }

  return (
    <ToastProvider>
      <ErrorBoundary>
        <div className="flex h-screen overflow-hidden">
          <StudioSidebar
            exportFlow={exportFlow}
            reloading={reloading}
            shortcuts={shortcuts}
            studio={studio}
            templates={templates}
          />
          <StudioCanvasPanel
            locales={locales}
            presets={presets}
            renderAdapter={renderAdapter}
            studio={studio}
          />
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
