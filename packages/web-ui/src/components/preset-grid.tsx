import type { RenderPreviewInput } from "@/hooks/use-render-preview";
import type { PresetData } from "@/hooks/use-templates";
import type { RenderAdapter } from "@/lib/renderer";

import { RenderTile } from "./render-tile";

interface PresetGridProps {
  presets: PresetData[];
  base: Omit<RenderPreviewInput, "preset">;
  renderAdapter: RenderAdapter;
  /** The preset the canvas shows; its tile is marked. */
  currentPresetId: string | null;
  onSelectPreset: (id: string) => void;
}

/** Every preset at once, so a change can be checked on all sizes before exporting. */
export const PresetGrid = ({
  presets,
  base,
  renderAdapter,
  currentPresetId,
  onSelectPreset,
}: PresetGridProps) => (
  <div className="bg-background grid min-h-0 flex-1 grid-cols-[repeat(auto-fill,minmax(18rem,1fr))] content-start gap-2 overflow-auto p-4">
    {presets.map((preset) => (
      <RenderTile
        current={preset.id === currentPresetId}
        detail={`${preset.width}×${preset.height}`}
        input={{ ...base, preset }}
        key={preset.id}
        label={preset.id}
        onSelect={() => onSelectPreset(preset.id)}
        renderAdapter={renderAdapter}
      />
    ))}
  </div>
);
