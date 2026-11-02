import { PipetteIcon } from "lucide-react";
import { createContext, useContext, useState } from "react";
import type * as React from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { hsvToRgb, parseHex, rgbToHsv, toHex } from "@/lib/color";
import type { Hsv } from "@/lib/color";
import { cn } from "@/lib/utils";

/** The colors already used in the template being edited; offered as quick picks. */
export const UsedColorsContext = createContext<readonly string[]>([]);

const MAX_HUE = 360;
const KEY_STEP = 0.02;

interface EyeDropperApi {
  open: () => Promise<{ sRGBHex: string }>;
}

const getEyeDropper = (): (new () => EyeDropperApi) | undefined =>
  (window as unknown as { EyeDropper?: new () => EyeDropperApi }).EyeDropper;

const clamp01 = (value: number): number => Math.min(1, Math.max(0, value));

/** Maps a pointer position inside `element` to 0–1 on both axes. */
const pointerFraction = (
  event: React.PointerEvent<HTMLElement>
): { x: number; y: number } => {
  const rect = event.currentTarget.getBoundingClientRect();
  return {
    x: clamp01((event.clientX - rect.left) / rect.width),
    y: clamp01((event.clientY - rect.top) / rect.height),
  };
};

const SaturationSquare = ({
  hsv,
  onChange,
}: {
  hsv: Hsv;
  onChange: (next: Hsv) => void;
}) => {
  const move = (event: React.PointerEvent<HTMLElement>) => {
    if (!event.currentTarget.hasPointerCapture(event.pointerId)) {
      return;
    }
    const { x, y } = pointerFraction(event);
    onChange({ ...hsv, s: x, v: 1 - y });
  };

  const handleKeyDown = (event: React.KeyboardEvent<HTMLElement>) => {
    const deltas: Record<string, [number, number]> = {
      ArrowDown: [0, -KEY_STEP],
      ArrowLeft: [-KEY_STEP, 0],
      ArrowRight: [KEY_STEP, 0],
      ArrowUp: [0, KEY_STEP],
    };
    const delta = deltas[event.key];
    if (!delta) {
      return;
    }
    event.preventDefault();
    onChange({
      ...hsv,
      s: clamp01(hsv.s + delta[0]),
      v: clamp01(hsv.v + delta[1]),
    });
  };

  return (
    <div
      aria-label="Saturation and brightness"
      aria-valuenow={Math.round(hsv.s * 100)}
      aria-valuetext={`Saturation ${Math.round(hsv.s * 100)}%, brightness ${Math.round(hsv.v * 100)}%`}
      className="focus-visible:ring-ring relative h-32 w-full cursor-crosshair touch-none rounded-md outline-none focus-visible:ring-2"
      onKeyDown={handleKeyDown}
      onPointerDown={(event) => {
        event.currentTarget.setPointerCapture(event.pointerId);
        const { x, y } = pointerFraction(event);
        onChange({ ...hsv, s: x, v: 1 - y });
      }}
      onPointerMove={move}
      // A two-axis control has no native element; the arrow keys mirror the drag.
      // oxlint-disable-next-line jsx-a11y/prefer-tag-over-role
      role="slider"
      style={{
        background: `linear-gradient(to top, #000, transparent), linear-gradient(to right, #fff, transparent), hsl(${hsv.h} 100% 50%)`,
      }}
      tabIndex={0}
    >
      <span
        className="pointer-events-none absolute size-3.5 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-white shadow-[0_0_0_1px_rgb(0_0_0/0.4)]"
        style={{ left: `${hsv.s * 100}%`, top: `${(1 - hsv.v) * 100}%` }}
      />
    </div>
  );
};

const hsv360 = (hue: number): number => ((hue % MAX_HUE) + MAX_HUE) % MAX_HUE;

const HueSlider = ({
  hue,
  onChange,
}: {
  hue: number;
  onChange: (hue: number) => void;
}) => (
  <input
    aria-label="Hue"
    className="focus-visible:ring-ring h-3 w-full cursor-pointer appearance-none rounded-full outline-none focus-visible:ring-2 [&::-moz-range-thumb]:size-3.5 [&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:border-2 [&::-moz-range-thumb]:border-white [&::-webkit-slider-thumb]:size-3.5 [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:border-2 [&::-webkit-slider-thumb]:border-white [&::-webkit-slider-thumb]:bg-transparent [&::-webkit-slider-thumb]:shadow-[0_0_0_1px_rgb(0_0_0/0.4)]"
    max={MAX_HUE}
    min={0}
    onChange={(event) => onChange(Number(event.target.value))}
    step={1}
    style={{
      background:
        "linear-gradient(to right, #f00, #ff0, #0f0, #0ff, #00f, #f0f, #f00)",
    }}
    type="range"
    value={Math.round(hsv360(hue))}
  />
);

const Swatch = ({
  color,
  className,
  ...props
}: { color: string } & React.ComponentProps<"button">) => (
  <button
    aria-label={color}
    className={cn(
      "border-border focus-visible:ring-ring size-5 shrink-0 cursor-pointer rounded-full border outline-none focus-visible:ring-2",
      className
    )}
    style={{ backgroundColor: color }}
    type="button"
    {...props}
  />
);

interface ColorPanelProps {
  value: string;
  onChange: (value: string) => void;
}

/** The popover body: square, hue, eyedropper, hex, and the template's own colors. */
const ColorPanel = ({ value, onChange }: ColorPanelProps) => {
  const used = useContext(UsedColorsContext);
  const rgba = parseHex(value) ?? { a: 1, b: 0, g: 0, r: 0 };
  const [hsv, setHsv] = useState<Hsv>(() => rgbToHsv(rgba));
  const [draft, setDraft] = useState<string | null>(null);
  const EyeDropper = getEyeDropper();

  // Follow outside edits (typing in the field, reset), but keep our own hue
  // while the value is just what this picker produced.
  if (toHex(hsvToRgb(hsv, rgba.a)) !== toHex(rgba)) {
    setHsv(rgbToHsv(rgba));
  }

  const emit = (next: Hsv) => {
    setHsv(next);
    onChange(toHex(hsvToRgb(next, rgba.a)));
  };

  const commitDraft = () => {
    if (draft !== null && parseHex(draft)) {
      onChange(draft.toLowerCase());
    }
    setDraft(null);
  };

  const pickFromScreen = async () => {
    if (!EyeDropper) {
      return;
    }
    try {
      const { sRGBHex } = await new EyeDropper().open();
      onChange(sRGBHex);
    } catch {
      // The user dismissed the eyedropper.
    }
  };

  return (
    <div className="flex flex-col gap-3">
      <SaturationSquare hsv={hsv} onChange={emit} />
      <HueSlider hue={hsv.h} onChange={(h) => emit({ ...hsv, h })} />
      <div className="flex items-center gap-2">
        {EyeDropper ? (
          <Button
            aria-label="Pick a color from the screen"
            onClick={pickFromScreen}
            size="icon-sm"
            variant="outline"
          >
            <PipetteIcon />
          </Button>
        ) : null}
        <Input
          aria-label="Hex color"
          className="font-mono"
          onBlur={commitDraft}
          onChange={(event) => setDraft(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter") {
              commitDraft();
            }
          }}
          size="sm"
          type="text"
          value={draft ?? value}
        />
      </div>
      {used.length > 0 ? (
        <fieldset
          aria-label="Colors in this template"
          className="m-0 flex min-w-0 flex-wrap gap-1.5 border-0 p-0"
        >
          {used.map((color) => (
            <Swatch color={color} key={color} onClick={() => onChange(color)} />
          ))}
        </fieldset>
      ) : null}
    </div>
  );
};

interface ColorInputProps {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
}

/**
 * A hex field with its swatch inside it. Typing commits a valid color on
 * blur or Enter; clicking the swatch opens the picker.
 */
export const ColorInput = ({ id, label, value, onChange }: ColorInputProps) => {
  const [draft, setDraft] = useState<string | null>(null);
  const valid = parseHex(value) !== null;

  const commit = () => {
    if (draft !== null && parseHex(draft)) {
      onChange(draft.toLowerCase());
    }
    setDraft(null);
  };

  return (
    <div className="relative">
      <Popover>
        <PopoverTrigger
          render={
            <button
              aria-label={`${label} picker`}
              className="border-border focus-visible:ring-ring absolute start-1.5 top-1/2 z-10 size-4.5 -translate-y-1/2 cursor-pointer rounded-sm border outline-none focus-visible:ring-2"
              style={{ backgroundColor: valid ? value : "transparent" }}
              type="button"
            />
          }
        />
        <PopoverContent
          align="start"
          className="w-60 gap-0 rounded-lg p-3"
          sideOffset={6}
        >
          <ColorPanel onChange={onChange} value={value} />
        </PopoverContent>
      </Popover>
      <Input
        aria-label={`${label} hex value`}
        aria-invalid={draft !== null && !parseHex(draft) ? true : undefined}
        className="font-mono [&_input]:ps-8"
        id={id}
        onBlur={commit}
        onChange={(event) => setDraft(event.target.value)}
        onKeyDown={(event) => {
          if (event.key === "Enter") {
            event.currentTarget.blur();
          } else if (event.key === "Escape") {
            setDraft(null);
            event.currentTarget.blur();
          }
        }}
        size="sm"
        type="text"
        value={draft ?? value}
      />
    </div>
  );
};
