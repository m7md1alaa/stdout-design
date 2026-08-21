import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type { StudioState } from "@/hooks/use-studio-state";
import type { PresetData } from "@/hooks/use-templates";
import type { RenderAdapter } from "@/lib/renderer";

import { Canvas } from "./canvas";
import { LocaleBar } from "./locale-bar";

/** What this panel actually reads off StudioState — narrower than the full shape. */
type CanvasPanelStudio = Pick<
  StudioState,
  | "autoDetected"
  | "currentPreset"
  | "effectiveLocale"
  | "effectivePresetId"
  | "effectiveTemplateId"
  | "handleLocaleChange"
  | "handleRenderIssues"
  | "propValues"
  | "reloadToken"
  | "setSelectedPreset"
>;

interface StudioCanvasPanelProps {
  locales: string[];
  presets: PresetData[];
  renderAdapter: RenderAdapter;
  studio: CanvasPanelStudio;
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
    <div className="border-border bg-surface-secondary overflow-x-auto border-b">
      <Tabs
        onValueChange={(next) => studio.setSelectedPreset(next as string)}
        value={studio.effectivePresetId ?? undefined}
      >
        <TabsList
          className="*:data-[slot=tabs-tab]:hover:bg-surface-hover w-full justify-start gap-0 rounded-none bg-transparent p-0"
          variant="underline"
        >
          {presets.map((preset) => (
            <TabsTrigger
              className="flex-col gap-0.5 rounded-none px-4 py-2.5"
              key={preset.id}
              value={preset.id}
            >
              <span className="text-xs font-semibold">{preset.id}</span>
              <span className="text-content-tertiary font-mono text-[10px]">
                {preset.width}&times;{preset.height}
              </span>
            </TabsTrigger>
          ))}
        </TabsList>
      </Tabs>
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
