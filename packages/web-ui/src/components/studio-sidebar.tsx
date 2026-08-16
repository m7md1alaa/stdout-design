import type { AppCommandsState } from "@/commands/use-app-commands";
import type { ExportState } from "@/hooks/use-export";
import type { StudioState } from "@/hooks/use-studio-state";

import { PropPanel } from "./prop-panel";
import { ShortcutHints } from "./shortcut-hints";
import { TemplateSelector } from "./template-selector";

interface TemplateOption {
  id: string;
  description: string;
}

interface StudioSidebarProps {
  templates: TemplateOption[];
  reloading: boolean;
  studio: StudioState;
  exportFlow: ExportState;
  shortcuts: AppCommandsState;
}

/** The left panel: template picker, prop editing, export, and shortcuts entry points. */
export const StudioSidebar = ({
  templates,
  reloading,
  studio,
  exportFlow,
  shortcuts,
}: StudioSidebarProps) => (
  <aside className="flex w-sidebar min-w-sidebar flex-col overflow-y-auto border-r border-border bg-surface-secondary">
    <div className="flex items-baseline gap-2 border-b border-border px-5 py-5 pb-4">
      <h1 className="text-lg font-bold tracking-tight text-content">stdout</h1>
      <span className="text-sm font-normal text-content-tertiary">studio</span>
      {reloading ? (
        <span className="ml-auto h-3 w-3 animate-pulse rounded-full bg-accent" />
      ) : null}
    </div>

    <TemplateSelector
      templates={templates}
      selected={studio.effectiveTemplateId}
      onChange={studio.handleTemplateChange}
    />

    {studio.currentTemplate ? (
      <PropPanel
        schema={studio.currentTemplate.propsSchema}
        values={studio.propValues}
        errors={studio.validationErrors}
        onChange={studio.handlePropChange}
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
        onClick={exportFlow.handleExport}
        disabled={!studio.effectiveTemplateId || !studio.currentPreset}
      >
        Export PNG
      </button>
      <ShortcutHints
        commands={shortcuts.commands}
        ids={["export-png", "copy-share-link", "reset-props"]}
        resolveBinding={shortcuts.bindings.resolve}
      />
      {exportFlow.exportError ? (
        <div className="mt-2 flex items-start gap-2 rounded-sm border border-red-500/30 bg-red-500/10 p-2">
          <p className="flex-1 text-sm text-danger">{exportFlow.exportError}</p>
          <button
            type="button"
            className="cursor-pointer border-none bg-none p-0 text-lg leading-none text-danger opacity-60 hover:opacity-100"
            onClick={exportFlow.handleDismissExportError}
          >
            &times;
          </button>
        </div>
      ) : null}
      {exportFlow.copyFeedback ? (
        <p className="mt-2 text-xs text-content-tertiary">
          {exportFlow.copyFeedback}
        </p>
      ) : null}
      <button
        type="button"
        className="mt-2 flex w-full cursor-pointer items-center justify-between text-[11px] text-content-tertiary hover:text-content-secondary"
        onClick={() => shortcuts.handleShortcutsOpenChange(true)}
      >
        <span className="underline-offset-2 hover:underline">
          Keyboard shortcuts
        </span>
        {shortcuts.shortcutsHelpLabel ? (
          <kbd className="rounded border border-border bg-surface-tertiary px-1 py-0.5 font-mono text-[10px]">
            {shortcuts.shortcutsHelpLabel}
          </kbd>
        ) : null}
      </button>
    </div>
  </aside>
);
