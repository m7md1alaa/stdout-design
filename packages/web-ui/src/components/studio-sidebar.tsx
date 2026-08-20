import type { AppCommandsState } from "@/commands/use-app-commands";
import { Button } from "@/components/ui/button";
import type { ExportState } from "@/hooks/use-export";
import type { StudioState } from "@/hooks/use-studio-state";

import { PropPanel } from "./prop-panel";
import { ShortcutHints } from "./shortcut-hints";
import { TemplateSelector } from "./template-selector";

interface TemplateOption {
  id: string;
  description: string;
}

/** What this panel actually reads off StudioState — narrower than the full shape. */
type SidebarStudio = Pick<
  StudioState,
  | "currentPreset"
  | "currentTemplate"
  | "effectiveTemplateId"
  | "handlePropChange"
  | "handleTemplateChange"
  | "propValues"
  | "validationErrors"
>;

interface StudioSidebarProps {
  templates: TemplateOption[];
  reloading: boolean;
  studio: SidebarStudio;
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
  <aside className="flex w-sidebar min-w-sidebar max-w-sidebar shrink-0 flex-col overflow-y-auto overflow-x-hidden border-r border-border bg-surface-secondary">
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
      <Button
        className="w-full"
        disabled={!studio.effectiveTemplateId || !studio.currentPreset}
        onClick={exportFlow.handleExport}
      >
        Export PNG
      </Button>
      <ShortcutHints
        commands={shortcuts.commands}
        ids={["export-png", "copy-share-link", "reset-props"]}
        resolveBinding={shortcuts.bindings.resolve}
      />
      <Button
        className="mt-2 h-auto w-full justify-between p-0 text-[11px] text-content-tertiary hover:bg-transparent hover:text-content-secondary"
        onClick={() => shortcuts.handleShortcutsOpenChange(true)}
        variant="ghost"
      >
        <span className="underline-offset-2 hover:underline">
          Keyboard shortcuts
        </span>
        {shortcuts.shortcutsHelpLabel ? (
          <kbd className="rounded border border-border bg-surface-tertiary px-1 py-0.5 font-mono text-[10px]">
            {shortcuts.shortcutsHelpLabel}
          </kbd>
        ) : null}
      </Button>
    </div>
  </aside>
);
