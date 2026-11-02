import { MinusIcon, PlusIcon } from "lucide-react";

import { Button } from "@/components/ui/button";
import type { CanvasView } from "@/hooks/use-canvas-view";
import { ZOOM_STEPS, formatZoom } from "@/lib/zoom";

interface CanvasStatusBarProps {
  preset: { id: string; width: number; height: number };
  view: CanvasView;
}

const [MIN_STEP] = ZOOM_STEPS;
const MAX_STEP = ZOOM_STEPS.at(-1) ?? 1;

/** Dimensions on the left; zoom controls on the right. */
export const CanvasStatusBar = ({ preset, view }: CanvasStatusBarProps) => {
  const fitted = view.zoom === "fit";
  const handleZoomOut = () => view.zoomOut();
  const handleZoomIn = () => view.zoomIn();
  const handleFit = () => view.setFit();
  const handleActualSize = () => view.setActualSize();
  const isActualSize = !fitted && view.scale === 1;

  return (
    <footer className="border-border bg-card text-muted-foreground flex h-8 shrink-0 items-center justify-between border-t px-3 font-mono text-xs tabular-nums">
      <span>
        {preset.id} · {preset.width}×{preset.height}
      </span>

      <div className="flex items-center gap-1">
        <Button
          aria-label="Zoom out"
          disabled={view.scale <= MIN_STEP}
          onClick={handleZoomOut}
          size="icon-xs"
          variant="ghost"
        >
          <MinusIcon />
        </Button>
        <span aria-live="polite" className="min-w-10 text-center">
          {formatZoom(view.scale)}
        </span>
        <Button
          aria-label="Zoom in"
          disabled={view.scale >= MAX_STEP}
          onClick={handleZoomIn}
          size="icon-xs"
          variant="ghost"
        >
          <PlusIcon />
        </Button>
        <Button
          aria-pressed={fitted}
          className="font-mono"
          onClick={handleFit}
          size="xs"
          variant="ghost"
        >
          Fit
        </Button>
        <Button
          aria-pressed={isActualSize}
          className="font-mono"
          onClick={handleActualSize}
          size="xs"
          variant="ghost"
        >
          100%
        </Button>
      </div>
    </footer>
  );
};
