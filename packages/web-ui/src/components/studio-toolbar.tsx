import { KeyboardIcon, LinkIcon } from "lucide-react";

import { formatCommandBinding, findHotkeyCommand } from "@/commands/bindings";
import type { AppCommandsState } from "@/commands/use-app-commands";
import { Button } from "@/components/ui/button";
import { Segmented } from "@/components/ui/segmented";
import {
  Select,
  SelectItem,
  SelectPopup,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Spinner } from "@/components/ui/spinner";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import type { ExportState } from "@/hooks/use-export";
import type { StudioState } from "@/hooks/use-studio-state";
import type { PresetData } from "@/hooks/use-templates";
import { VIEW_MODE_LABELS, VIEW_MODES } from "@/lib/view-mode";
import type { ViewMode } from "@/lib/view-mode";

import { ExportMenu } from "./export-menu";
import { TemplateSwitcher } from "./template-switcher";

interface TemplateOption {
  id: string;
  description: string;
}

type ToolbarStudio = Pick<
  StudioState,
  | "currentPreset"
  | "effectiveLocale"
  | "effectivePresetId"
  | "effectiveTemplateId"
  | "handleLocaleChange"
  | "handleTemplateChange"
  | "setSelectedPreset"
>;

interface StudioToolbarProps {
  templates: TemplateOption[];
  presets: PresetData[];
  locales: string[];
  rendering: boolean;
  mode: ViewMode;
  onModeChange: (mode: ViewMode) => void;
  compareLocale: string | null;
  onCompareLocaleChange: (locale: string) => void;
  studio: ToolbarStudio;
  exportFlow: ExportState;
  shortcuts: AppCommandsState;
}

const presetLabel = (preset: PresetData): string =>
  `${preset.id} · ${preset.width}×${preset.height}`;

interface IconActionProps {
  label: string;
  shortcut?: string;
  disabled?: boolean;
  onClick: () => void;
  children: React.ReactNode;
}

const IconAction = ({
  label,
  shortcut,
  disabled,
  onClick,
  children,
}: IconActionProps) => (
  <Tooltip>
    <TooltipTrigger
      render={
        <Button
          aria-label={label}
          disabled={disabled}
          onClick={onClick}
          size="icon-sm"
          variant="ghost"
        />
      }
    >
      {children}
    </TooltipTrigger>
    <TooltipContent>
      {label}
      {shortcut ? (
        <kbd className="text-muted-foreground ms-2 font-mono">{shortcut}</kbd>
      ) : null}
    </TooltipContent>
  </Tooltip>
);

/** The 44 px top bar: what you're editing, where it renders, and how to get it out. */
export const StudioToolbar = ({
  templates,
  presets,
  locales,
  rendering,
  mode,
  onModeChange,
  compareLocale,
  onCompareLocaleChange,
  studio,
  exportFlow,
  shortcuts,
}: StudioToolbarProps) => {
  const shortcutFor = (id: string): string | undefined => {
    const command = findHotkeyCommand(shortcuts.commands, id);
    return command
      ? formatCommandBinding(shortcuts.bindings.resolve, command)
      : undefined;
  };

  const canExport = Boolean(studio.effectiveTemplateId && studio.currentPreset);

  return (
    <header className="border-border bg-card flex h-11 shrink-0 items-center gap-2 overflow-hidden border-b px-3">
      {/* The left cluster shrinks (names truncate) so the actions never leave the screen. */}
      <div className="flex min-w-0 flex-1 items-center gap-2">
        <TemplateSwitcher
          onChange={studio.handleTemplateChange}
          selected={studio.effectiveTemplateId}
          templates={templates}
        />

        <div className="bg-border mx-1 h-4 w-px shrink-0" />

        <Select
          onValueChange={(next) => studio.setSelectedPreset(next as string)}
          value={studio.effectivePresetId ?? undefined}
        >
          <SelectTrigger
            aria-label="Preset"
            className="w-auto min-w-0 shrink-[3] font-mono"
            size="sm"
          >
            <SelectValue placeholder="Preset">
              {(value: string | null) => {
                const preset = presets.find((p) => p.id === value);
                return preset ? presetLabel(preset) : "Preset";
              }}
            </SelectValue>
          </SelectTrigger>
          <SelectPopup>
            {presets.map((preset) => (
              <SelectItem
                className="font-mono"
                key={preset.id}
                value={preset.id}
              >
                {presetLabel(preset)}
              </SelectItem>
            ))}
          </SelectPopup>
        </Select>

        {locales.length > 0 ? (
          <Select
            onValueChange={(next) => studio.handleLocaleChange(next as string)}
            value={studio.effectiveLocale ?? undefined}
          >
            <SelectTrigger
              aria-label="Locale"
              className="w-auto min-w-0 shrink-0 font-mono"
              size="sm"
            >
              <SelectValue placeholder="Locale" />
            </SelectTrigger>
            <SelectPopup>
              {locales.map((locale) => (
                <SelectItem className="font-mono" key={locale} value={locale}>
                  {locale}
                </SelectItem>
              ))}
            </SelectPopup>
          </Select>
        ) : null}

        {mode === "compare" ? (
          <>
            <span className="text-muted-foreground shrink-0 text-xs">vs</span>
            <Select
              onValueChange={(next) => onCompareLocaleChange(next as string)}
              value={compareLocale ?? undefined}
            >
              <SelectTrigger
                aria-label="Compare with locale"
                className="w-auto min-w-0 shrink-0 font-mono"
                size="sm"
              >
                <SelectValue placeholder="Locale" />
              </SelectTrigger>
              <SelectPopup>
                {locales
                  .filter((locale) => locale !== studio.effectiveLocale)
                  .map((locale) => (
                    <SelectItem
                      className="font-mono"
                      key={locale}
                      value={locale}
                    >
                      {locale}
                    </SelectItem>
                  ))}
              </SelectPopup>
            </Select>
          </>
        ) : null}
      </div>

      <div className="flex shrink-0 items-center gap-2">
        <div className="w-60 shrink-0">
          <Segmented
            label="View"
            labels={VIEW_MODE_LABELS}
            onValueChange={(next) => onModeChange(next as ViewMode)}
            options={
              locales.length > 1
                ? VIEW_MODES
                : VIEW_MODES.filter((m) => m !== "compare")
            }
            value={mode}
          />
        </div>
        {rendering ? (
          <Spinner aria-label="Rendering" className="size-3.5 opacity-60" />
        ) : null}

        <IconAction
          label="Keyboard shortcuts"
          onClick={() => shortcuts.handleShortcutsOpenChange(true)}
          shortcut={shortcuts.shortcutsHelpLabel ?? undefined}
        >
          <KeyboardIcon />
        </IconAction>
        <IconAction
          disabled={!studio.effectiveTemplateId}
          label="Copy link"
          onClick={exportFlow.handleCopyShareLink}
          shortcut={shortcutFor("copy-share-link")}
        >
          <LinkIcon />
        </IconAction>

        <ExportMenu
          busy={exportFlow.busy}
          disabled={!canExport}
          exportShortcut={shortcutFor("export-png")}
          onCopyImage={exportFlow.handleCopyImage}
          onExport={exportFlow.handleExport}
          onExportAll={exportFlow.handleExportAll}
          presetCount={presets.length}
        />
      </div>
    </header>
  );
};
