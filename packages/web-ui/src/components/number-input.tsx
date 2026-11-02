import { useState } from "react";

import { Input } from "@/components/ui/input";
import {
  clampToBounds,
  isWithinBounds,
  parseNumberInput,
  resolveNumberStep,
} from "@/lib/number-field";

interface NumberInputProps {
  id?: string;
  label: string;
  value: number;
  schema: Record<string, unknown>;
  className?: string;
  size?: "sm" | "default";
  onChange: (value: number) => void;
}

/**
 * A number the user can type. What they type is a draft: a value that parses
 * and is in range goes up as they type, so the preview follows, but an empty
 * or half-typed input (`""`, `"-"`, `"1."`) never writes `0` into the props.
 * On blur the draft is dropped and the field shows the real value again,
 * after an out-of-range number is clamped.
 */
export const NumberInput = ({
  id,
  label,
  value,
  schema,
  className,
  size,
  onChange,
}: NumberInputProps) => {
  const [draft, setDraft] = useState<string | null>(null);

  const finish = () => {
    const parsed = draft === null ? null : parseNumberInput(draft);
    if (parsed !== null) {
      const clamped = clampToBounds(parsed, schema);
      if (clamped !== value) {
        onChange(clamped);
      }
    }
    setDraft(null);
  };

  return (
    <Input
      aria-label={label}
      className={className}
      id={id}
      inputMode="decimal"
      onBlur={finish}
      onChange={(e) => {
        const text = e.target.value;
        setDraft(text);
        const parsed = parseNumberInput(text);
        if (parsed !== null && isWithinBounds(parsed, schema)) {
          onChange(parsed);
        }
      }}
      onKeyDown={(e) => {
        if (e.key === "Enter") {
          e.currentTarget.blur();
        } else if (e.key === "ArrowUp" || e.key === "ArrowDown") {
          e.preventDefault();
          const step = resolveNumberStep(schema);
          const next = clampToBounds(
            Number((value + (e.key === "ArrowUp" ? step : -step)).toFixed(6)),
            schema
          );
          setDraft(null);
          onChange(next);
        }
      }}
      size={size}
      type="text"
      value={draft ?? String(value)}
    />
  );
};
