import { PipetteIcon, X } from "lucide-react";
import { useCallback, useState } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Select,
  SelectItem,
  SelectPopup,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import {
  hexToHsl,
  hslToHex,
  isValidHex,
  pickColorFromScreen,
  supportsEyeDropper,
} from "@/lib/color";
import { resolveFieldKind } from "@/lib/resolve-field-kind";
import { cn } from "@/lib/utils";

interface PropFieldProps {
  name: string;
  schema: Record<string, unknown>;
  value: unknown;
  error?: string;
  onChange: (value: unknown) => void;
}

const resolveValue = (
  value: unknown,
  schema: Record<string, unknown>
): unknown => {
  if (value !== undefined && value !== null) {
    return value;
  }
  return schema.default;
};

const FieldLabel = ({ name, label }: { name: string; label: string }) => (
  <Label
    className="mb-1.5 block text-xs font-medium text-content-secondary"
    htmlFor={`prop-${name}`}
  >
    {label}
  </Label>
);

const FieldWrapper = ({
  name,
  label,
  error,
  children,
}: {
  name: string;
  label: string;
  error?: string;
  children: React.ReactNode;
}) => (
  <div className="mb-3">
    <FieldLabel label={label} name={name} />
    {children}
    {error ? (
      <p className="mt-1 text-[11px] leading-tight text-danger">{error}</p>
    ) : null}
  </div>
);

/** Our Slider wrapper types onValueChange as `number | readonly number[]`
 * regardless of what's passed in (it's not generic over its own props) —
 * every usage here is a single-thumb slider, so normalize back to a number. */
const asSingleValue = (value: number | readonly number[]): number =>
  Array.isArray(value) ? value[0] : (value as number);

const HUE_TRACK_GRADIENT =
  "[&_[data-slot=slider-track]]:bg-[linear-gradient(to_right,red,#ff0,lime,cyan,blue,magenta,red)] [&_[data-slot=slider-indicator]]:bg-transparent";

const HslSliderRow = ({
  axis,
  value,
  max,
  suffix,
  className,
  onChange,
}: {
  axis: string;
  value: number;
  max: number;
  suffix?: string;
  className?: string;
  onChange: (value: number) => void;
}) => (
  <div className="flex items-center gap-2">
    <span className="w-3.5 text-[10px] font-semibold uppercase text-content-tertiary">
      {axis}
    </span>
    <Slider
      className={cn("flex-1", className)}
      max={max}
      min={0}
      onValueChange={(next) => onChange(asSingleValue(next))}
      value={value}
    />
    <span className="w-9 text-right font-mono text-[10px] text-content-tertiary">
      {Math.round(value)}
      {suffix}
    </span>
  </div>
);

const ColorField = ({
  name,
  label,
  value,
  onChange,
}: {
  name: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
}) => {
  const hex = isValidHex(value) ? value : "#000000";
  const { h, s, l } = hexToHsl(hex);
  const eyeDropperAvailable = supportsEyeDropper();

  const setHsl = useCallback(
    (next: Partial<{ h: number; s: number; l: number }>) => {
      onChange(hslToHex(next.h ?? h, next.s ?? s, next.l ?? l));
    },
    [h, s, l, onChange]
  );

  const handleEyeDropper = useCallback(async () => {
    const picked = await pickColorFromScreen();
    if (picked) {
      onChange(picked);
    }
  }, [onChange]);

  return (
    <div className="mb-3">
      <FieldLabel label={label} name={name} />
      <div className="flex items-center gap-2">
        <Popover>
          <PopoverTrigger
            className="h-8 w-8 shrink-0 cursor-pointer rounded-sm border border-border p-0"
            style={{ backgroundColor: hex }}
            title={hex}
          />
          <PopoverContent
            align="start"
            className="flex w-64 flex-col gap-3 p-3"
            side="left"
            sideOffset={8}
          >
            <div className="flex items-center gap-2">
              <div
                className="h-8 flex-1 rounded-sm border border-border"
                style={{ backgroundColor: hex }}
              />
              {eyeDropperAvailable ? (
                <Button
                  aria-label="Pick color from screen"
                  onClick={handleEyeDropper}
                  size="icon-sm"
                  type="button"
                  variant="outline"
                >
                  <PipetteIcon />
                </Button>
              ) : null}
            </div>
            <div className="flex flex-col gap-2">
              <HslSliderRow
                axis="H"
                className={HUE_TRACK_GRADIENT}
                max={360}
                onChange={(next) => setHsl({ h: next })}
                value={h}
              />
              <HslSliderRow
                axis="S"
                max={100}
                onChange={(next) => setHsl({ s: next })}
                suffix="%"
                value={s}
              />
              <HslSliderRow
                axis="L"
                max={100}
                onChange={(next) => setHsl({ l: next })}
                suffix="%"
                value={l}
              />
            </div>
          </PopoverContent>
        </Popover>
        <Input
          aria-label={`${label} hex value`}
          className="flex-1 font-mono"
          id={`prop-${name}`}
          onChange={(e) => onChange(e.target.value)}
          type="text"
          value={value}
        />
      </div>
    </div>
  );
};

const EnumField = ({
  name,
  label,
  value,
  options,
  onChange,
}: {
  name: string;
  label: string;
  value: string;
  options: string[];
  onChange: (value: string) => void;
}) => (
  <div className="mb-3">
    <FieldLabel label={label} name={name} />
    <Select onValueChange={(next) => onChange(next as string)} value={value}>
      <SelectTrigger className="w-full" id={`prop-${name}`}>
        <SelectValue />
      </SelectTrigger>
      <SelectPopup>
        {options.map((opt) => (
          <SelectItem key={opt} value={opt}>
            {opt}
          </SelectItem>
        ))}
      </SelectPopup>
    </Select>
  </div>
);

const NumberField = ({
  name,
  label,
  value,
  schema,
  error,
  onChange,
}: {
  name: string;
  label: string;
  value: unknown;
  schema: Record<string, unknown>;
  error?: string;
  onChange: (value: number) => void;
}) => {
  const min = schema.minimum as number | undefined;
  const max = schema.maximum as number | undefined;
  const hasRange = min !== undefined && max !== undefined;
  const numValue = (value as number | undefined) ?? min ?? 0;

  if (hasRange) {
    return (
      <FieldWrapper error={error} label={label} name={name}>
        <div className="flex items-center gap-3">
          <Slider
            aria-label={label}
            className="flex-1"
            max={max}
            min={min}
            onValueChange={(next) => onChange(asSingleValue(next))}
            step={1}
            value={numValue}
          />
          <span className="min-w-[32px] text-right font-mono text-xs text-content-tertiary">
            {String(numValue)}
          </span>
        </div>
      </FieldWrapper>
    );
  }

  return (
    <FieldWrapper error={error} label={label} name={name}>
      <Input
        id={`prop-${name}`}
        max={max}
        min={min}
        onChange={(e) => onChange(Number(e.target.value))}
        type="number"
        value={numValue}
      />
    </FieldWrapper>
  );
};

const BooleanField = ({
  name,
  label,
  value,
  onChange,
}: {
  name: string;
  label: string;
  value: boolean;
  onChange: (value: boolean) => void;
}) => (
  <div className="mb-3 flex items-center justify-between">
    <Label
      className="text-xs font-medium text-content-secondary"
      htmlFor={`prop-${name}`}
    >
      {label}
    </Label>
    <Switch checked={value} id={`prop-${name}`} onCheckedChange={onChange} />
  </div>
);

const parseNumericInput = (raw: string): number[] => {
  const trimmed = raw.trim();
  if (!trimmed) {
    return [];
  }

  const stripped =
    trimmed.startsWith("[") && trimmed.endsWith("]")
      ? trimmed.slice(1, -1)
      : trimmed;

  return stripped
    .split(",")
    .map((s) => s.trim())
    .filter((s) => s.length > 0)
    .map(Number)
    .filter((n) => !Number.isNaN(n));
};

/** Shared chip row for the numeric/string array fields — the one part of
 * those two fields that was ever actually identical. */
const TagList = ({
  items,
  onRemove,
}: {
  items: string[];
  onRemove: (index: number) => void;
}) =>
  items.length === 0 ? null : (
    <div className="mb-1.5 flex flex-wrap gap-1">
      {items.map((item, i) => (
        <Badge
          className="gap-1 rounded-full bg-accent-muted pr-1 text-[11px] text-accent-hover hover:bg-accent-muted"
          key={`${item}-${i}`}
          variant="secondary"
        >
          {item}
          <button
            aria-label={`Remove ${item}`}
            className="flex size-3.5 cursor-pointer items-center justify-center rounded-full border-none bg-transparent p-0 text-accent-hover/60 transition-colors hover:text-danger"
            onClick={() => onRemove(i)}
            type="button"
          >
            <X size={10} />
          </button>
        </Badge>
      ))}
    </div>
  );

const NumericArrayField = ({
  label,
  value,
  onChange,
}: {
  label: string;
  value: number[] | undefined;
  onChange: (value: number[]) => void;
}) => {
  const currentValue = value ?? [];
  const [raw, setRaw] = useState("");

  const commitRaw = useCallback(
    (input: string) => {
      const parsed = parseNumericInput(input);
      if (parsed.length > 0) {
        onChange(parsed);
      }
      setRaw("");
    },
    [onChange]
  );

  return (
    <div className="mb-3">
      <Label className="mb-1 block text-xs font-medium text-content-secondary">
        {label}
      </Label>
      <TagList
        items={currentValue.map(String)}
        onRemove={(i) => {
          const next = [...currentValue];
          next.splice(i, 1);
          onChange(next);
        }}
      />
      <Input
        onBlur={() => {
          if (raw.trim()) {
            commitRaw(raw);
          }
        }}
        onChange={(e) => setRaw(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            e.preventDefault();
            commitRaw(e.currentTarget.value);
          }
        }}
        placeholder="e.g. 30, 45, 25, 60..."
        type="text"
        value={raw}
      />
    </div>
  );
};

const StringArrayField = ({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string[] | undefined;
  onChange: (value: string[]) => void;
}) => {
  const currentValue = value ?? [];

  return (
    <div className="mb-3">
      <Label className="mb-1 block text-xs font-medium text-content-secondary">
        {label}
      </Label>
      <TagList
        items={currentValue}
        onRemove={(i) => {
          const next = [...currentValue];
          next.splice(i, 1);
          onChange(next);
        }}
      />
      <Input
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            const input = e.currentTarget;
            const val = input.value.trim();
            if (val) {
              onChange([...currentValue, val]);
              input.value = "";
            }
          }
        }}
        placeholder="Add item and press Enter..."
        type="text"
      />
    </div>
  );
};

const ArrayField = ({
  label,
  value,
  schema,
  onChange,
}: {
  label: string;
  value: unknown;
  schema: Record<string, unknown>;
  onChange: (value: unknown) => void;
}) => {
  const itemsType = (schema.items as { type?: string } | undefined)?.type;

  if (itemsType === "number") {
    return (
      <NumericArrayField
        label={label}
        onChange={onChange as (value: number[]) => void}
        value={value as number[] | undefined}
      />
    );
  }

  return (
    <StringArrayField
      label={label}
      onChange={onChange as (value: string[]) => void}
      value={value as string[] | undefined}
    />
  );
};

export const PropField = ({
  name,
  schema,
  value,
  error,
  onChange,
}: PropFieldProps) => {
  const label = (schema.description as string) ?? name;
  const currentValue = resolveValue(value, schema);
  const fieldKind = resolveFieldKind(name, schema);

  switch (fieldKind.kind) {
    case "color": {
      return (
        <ColorField
          label={label}
          name={name}
          onChange={onChange as (value: string) => void}
          value={(currentValue ?? "#000000") as string}
        />
      );
    }

    case "enum": {
      return (
        <EnumField
          label={label}
          name={name}
          onChange={onChange as (value: string) => void}
          options={fieldKind.options}
          value={String(currentValue ?? fieldKind.options[0])}
        />
      );
    }

    case "number": {
      return (
        <NumberField
          error={error}
          label={label}
          name={name}
          onChange={onChange as (value: number) => void}
          schema={schema}
          value={currentValue}
        />
      );
    }

    case "boolean": {
      return (
        <BooleanField
          label={label}
          name={name}
          onChange={onChange as (value: boolean) => void}
          value={Boolean(currentValue)}
        />
      );
    }

    case "array": {
      return (
        <ArrayField
          label={label}
          onChange={onChange}
          schema={schema}
          value={currentValue}
        />
      );
    }

    case "text": {
      return (
        <FieldWrapper error={error} label={label} name={name}>
          {fieldKind.multiline ? (
            <textarea
              className={cn("field-input resize-y", error && "border-danger")}
              id={`prop-${name}`}
              onChange={(e) => onChange(e.target.value)}
              rows={3}
              value={(currentValue as string) ?? ""}
            />
          ) : (
            <Input
              className={cn(error && "border-danger")}
              id={`prop-${name}`}
              onChange={(e) => onChange(e.target.value)}
              type="text"
              value={(currentValue as string) ?? ""}
            />
          )}
        </FieldWrapper>
      );
    }

    default: {
      const exhaustive: never = fieldKind;
      return exhaustive;
    }
  }
};
