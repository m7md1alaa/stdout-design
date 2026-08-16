import type { StudioState } from "@/hooks/use-studio-state";
import type { PresetData } from "@/hooks/use-templates";
import type { RenderAdapter } from "@/lib/renderer";

import { Canvas } from "./canvas";
import { LocaleBar } from "./locale-bar";

interface StudioCanvasPanelProps {
  locales: string[];
  presets: PresetData[];
  renderAdapter: RenderAdapter;
  studio: StudioState;
}

/** The main panel: locale switcher, preset tabs, and the live render preview. */
export const StudioCanvasPanel = ({
  locales,
  presets,
  renderAdapter,
  studio,
}: StudioCanvasPanelProps) => (
  <main className="flex flex-1 flex-col overflow-hidden">
    <LocaleBar
      locales={locales}
      selected={studio.effectiveLocale}
      onChange={studio.handleLocaleChange}
    />
    <div className="flex overflow-x-auto border-b border-border bg-surface-secondary">
      {presets.map((preset) => (
        <button
          key={preset.id}
          type="button"
          className={`flex cursor-pointer flex-col items-center gap-0.5 whitespace-nowrap border-none bg-none px-4 py-2.5 text-content-tertiary transition-colors hover:text-content-secondary ${studio.effectivePresetId === preset.id ? "border-b-2 border-accent text-accent" : "border-b-2 border-transparent"}`}
          onClick={() => studio.setSelectedPreset(preset.id)}
        >
          <span className="text-xs font-semibold">{preset.id}</span>
          <span className="font-mono text-[10px] text-content-tertiary">
            {preset.width}&times;{preset.height}
          </span>
        </button>
      ))}
    </div>

    <Canvas
      templateId={studio.effectiveTemplateId}
      props={studio.propValues}
      preset={studio.currentPreset}
      locale={studio.effectiveLocale}
      autoDetected={studio.autoDetected}
      reloadToken={studio.reloadToken}
      renderAdapter={renderAdapter}
      onRenderIssues={studio.handleRenderIssues}
    />
  </main>
);
