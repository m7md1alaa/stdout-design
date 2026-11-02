import type { CanvasView } from "@/hooks/use-canvas-view";
import type {
  RenderPreviewInput,
  RenderPreviewState,
} from "@/hooks/use-render-preview";
import type { PresetData } from "@/hooks/use-templates";
import type { TranslationPaths } from "@/lib/locale-layer";
import type { RenderAdapter } from "@/lib/renderer";
import type { ViewMode } from "@/lib/view-mode";

import { Canvas } from "./canvas";
import { CanvasStatusBar } from "./canvas-status-bar";
import { LocaleCompare } from "./locale-compare";
import { PresetGrid } from "./preset-grid";

interface StudioCanvasPanelProps {
  mode: ViewMode;
  hasTemplate: boolean;
  preset: { id: string; width: number; height: number } | null;
  presets: PresetData[];
  render: RenderPreviewState | null;
  view: CanvasView;
  /** The current render inputs; the grid and compare views vary one part of it. */
  input: RenderPreviewInput;
  compareLocale: string | null;
  /** A locale's own text, so the compare view renders each side with its edits. */
  overridesFor: (locale: string | null) => TranslationPaths;
  renderAdapter: RenderAdapter;
  onSelectPreset: (id: string) => void;
}

/** The middle region: the live render, or the all-presets and locale-compare views. */
export const StudioCanvasPanel = ({
  mode,
  hasTemplate,
  preset,
  presets,
  render,
  view,
  input,
  compareLocale,
  overridesFor,
  renderAdapter,
  onSelectPreset,
}: StudioCanvasPanelProps) => {
  const { preset: _preset, ...withoutPreset } = input;
  const { locale, autoDetected, localeOverrides, ...withoutLocale } = input;

  if (hasTemplate && mode === "presets") {
    return (
      <main className="flex min-w-0 flex-1 flex-col overflow-hidden">
        <PresetGrid
          base={withoutPreset}
          currentPresetId={preset?.id ?? null}
          onSelectPreset={onSelectPreset}
          presets={presets}
          renderAdapter={renderAdapter}
        />
      </main>
    );
  }

  if (hasTemplate && mode === "compare" && preset) {
    return (
      <main className="flex min-w-0 flex-1 flex-col overflow-hidden">
        <LocaleCompare
          base={withoutLocale}
          primary={{ autoDetected, locale, localeOverrides }}
          renderAdapter={renderAdapter}
          secondary={{
            autoDetected: false,
            locale: compareLocale,
            localeOverrides: overridesFor(compareLocale),
          }}
        />
      </main>
    );
  }

  return (
    <main className="flex min-w-0 flex-1 flex-col overflow-hidden">
      <Canvas
        hasTemplate={hasTemplate}
        preset={preset}
        render={render}
        view={view}
      />
      {hasTemplate && preset ? (
        <CanvasStatusBar preset={preset} view={view} />
      ) : null}
    </main>
  );
};
