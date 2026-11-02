import { useCallback, useState } from "react";

import { fitScale, resolveZoom, stepZoom } from "../lib/zoom";
import type { Zoom } from "../lib/zoom";
import { useElementSize } from "./use-element-size";

interface Size {
  width: number;
  height: number;
}

/**
 * The canvas's view: the measured area, the zoom mode, and the scale they
 * resolve to. Lives above the canvas so zoom shortcuts can drive it.
 */
export const useCanvasView = (preset: Size | null) => {
  const { ref: areaRef, width, height } = useElementSize<HTMLDivElement>();
  const [zoom, setZoom] = useState<Zoom>("fit");

  const fit = preset ? fitScale({ height, width }, preset) : 1;
  const scale = resolveZoom(zoom, fit);

  const zoomBy = useCallback(
    (direction: 1 | -1) => {
      const next = stepZoom(scale, direction);
      if (next !== "limit") {
        setZoom(next);
      }
    },
    [scale]
  );

  return {
    areaRef,
    fit,
    scale,
    setActualSize: useCallback(() => setZoom(1), []),
    setFit: useCallback(() => setZoom("fit"), []),
    zoom,
    zoomIn: useCallback(() => zoomBy(1), [zoomBy]),
    zoomOut: useCallback(() => zoomBy(-1), [zoomBy]),
  };
};

export type CanvasView = ReturnType<typeof useCanvasView>;
