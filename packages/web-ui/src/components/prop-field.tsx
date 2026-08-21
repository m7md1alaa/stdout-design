import { X } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";

import { Badge } from "@/components/ui/badge";
import { ColorPickerPopover, parseColor } from "@/components/ui/color-picker";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectItem,
  SelectPopup,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
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
    className="text-content-secondary mb-1.5 block text-xs font-medium"
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
      <p className="text-danger mt-1 text-[11px] leading-tight">{error}</p>
    ) : null}
  </div>
);

/** Our Slider wrapper types onValueChange as `number | readonly number[]`
 * regardless of what's passed in (it's not generic over its own props) —
 * every usage here is a single-thumb slider, so normalize back to a number. */
const asSingleValue = (value: number | readonly number[]): number =>
  Array.isArray(value) ? value[0] : (value as number);

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
  const safeValue = parseColor(value) ? value : "#000000";

  // Draft-based, commit-on-blur/Enter — mirrors the picker's own channel
  // inputs so typing a partial hex ("#ff") doesn't push an invalid value up
  // to the schema on every keystroke.
  const [draft, setDraft] = useState(value);
  const interactingRef = useRef(false);

  useEffect(() => {
    if (!interactingRef.current) {
      setDraft(value);
    }
  }, [value]);

  const commit = useCallback(
    (next: string) => {
      if (parseColor(next)) {
        onChange(next);
      } else {
        setDraft(value);
      }
    },
    [onChange, value]
  );

  return (
    <div className="mb-3">
      <FieldLabel label={label} name={name} />
      <div className="flex items-center gap-2">
        <ColorPickerPopover
          onValueChange={(next) => onChange(next)}
          triggerClassName="h-8 w-8 shrink-0 justify-center p-0"
          triggerShowValue={false}
          value={safeValue}
        />
        <Input
          aria-label={`${label} hex value`}
          className="flex-1 font-mono"
          id={`prop-${name}`}
          onBlur={() => {
            interactingRef.current = false;
            commit(draft);
          }}
          onChange={(e) => setDraft(e.target.value)}
          onFocus={() => {
            interactingRef.current = true;
          }}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.currentTarget.blur();
            } else if (e.key === "Escape") {
              setDraft(value);
              e.currentTarget.blur();
            }
          }}
          type="text"
          value={draft}
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
          <span className="text-content-tertiary min-w-[32px] text-right font-mono text-xs">
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
      className="text-content-secondary text-xs font-medium"
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
          className="bg-accent-muted text-accent-hover hover:bg-accent-muted gap-1 rounded-full pr-1 text-[11px]"
          key={`${item}-${i}`}
          variant="secondary"
        >
          {item}
          <button
            aria-label={`Remove ${item}`}
            className="text-accent-hover/60 hover:text-danger flex size-3.5 cursor-pointer items-center justify-center rounded-full border-none bg-transparent p-0 transition-colors"
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
      <Label className="text-content-secondary mb-1 block text-xs font-medium">
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
      <Label className="text-content-secondary mb-1 block text-xs font-medium">
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
