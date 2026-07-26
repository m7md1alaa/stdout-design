"use client";

/**
 * STAND-IN IMPLEMENTATION.
 *
 * This file exists because the real `@dither-kit/cli add gradient` command
 * could not be run from this environment (tripwire.sh is not reachable from
 * the sandbox this was built in). It reproduces the documented public API —
 *
 *   <DitherGradient from="purple" direction="up" />
 *
 * — used inside a `position: relative` container, via a small ordered
 * (Bayer) dithering routine on canvas.
 *
 * To swap in the real component: run `npx @dither-kit/cli add gradient`
 * from the project root, then delete this file. Nothing that imports
 * `DitherGradient` needs to change — the prop contract matches.
 */

import { useEffect, useRef } from "react";

type DitherColor =
  | "green"
  | "blue"
  | "purple"
  | "pink"
  | "orange"
  | "red"
  | "grey";

type Direction = "up" | "down" | "left" | "right";

interface DitherGradientProps {
  from: DitherColor;
  direction?: Direction;
  /** Dither cell size in device pixels. Bigger = chunkier/more retro. */
  cell?: number;
  className?: string;
}

const PALETTE: Record<DitherColor, [number, number, number]> = {
  blue: [79, 140, 255],
  green: [92, 214, 150],
  grey: [156, 150, 138],
  orange: [255, 138, 43],
  pink: [255, 122, 178],
  purple: [162, 122, 255],
  red: [255, 92, 92],
};

// 4x4 Bayer ordered-dither threshold matrix, normalized 0..1.
const BAYER_4X4 = [
  [0, 8, 2, 10],
  [12, 4, 14, 6],
  [3, 11, 1, 9],
  [15, 7, 13, 5],
].map((row) => row.map((v) => (v + 0.5) / 16));

export function DitherGradient({
  from,
  direction = "up",
  cell = 3,
  className,
}: DitherGradientProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const [r, g, b] = PALETTE[from];

    const draw = () => {
      const parent = canvas.parentElement;
      if (!parent) return;
      const { width, height } = parent.getBoundingClientRect();
      if (width === 0 || height === 0) return;

      const cols = Math.ceil(width / cell);
      const rows = Math.ceil(height / cell);
      canvas.width = cols;
      canvas.height = rows;
      canvas.style.width = `${width}px`;
      canvas.style.height = `${height}px`;

      const image = ctx.createImageData(cols, rows);

      for (let y = 0; y < rows; y++) {
        for (let x = 0; x < cols; x++) {
          let t: number;
          switch (direction) {
            case "down":
              t = y / rows;
              break;
            case "left":
              t = 1 - x / cols;
              break;
            case "right":
              t = x / cols;
              break;
            case "up":
            default:
              t = 1 - y / rows;
              break;
          }

          // Ease so the wash concentrates near its source edge.
          const intensity = Math.pow(t, 1.6);
          const threshold = BAYER_4X4[y % 4]![x % 4]!;
          const on = intensity > threshold;

          const idx = (y * cols + x) * 4;
          if (on) {
            const alpha = 0.35 + intensity * 0.4;
            image.data[idx] = r;
            image.data[idx + 1] = g;
            image.data[idx + 2] = b;
            image.data[idx + 3] = Math.round(alpha * 255);
          } else {
            image.data[idx + 3] = 0;
          }
        }
      }

      ctx.putImageData(image, 0, 0);
    };

    draw();

    const observer = new ResizeObserver(draw);
    if (canvas.parentElement) observer.observe(canvas.parentElement);

    return () => observer.disconnect();
  }, [from, direction, cell]);

  return (
    <canvas
      ref={canvasRef}
      aria-hidden="true"
      className={className}
      style={{
        imageRendering: "pixelated",
        inset: 0,
        pointerEvents: "none",
        position: "absolute",
      }}
    />
  );
}
