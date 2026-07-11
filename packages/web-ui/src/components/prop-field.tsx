import { X } from "lucide-react";
import { useCallback, useRef, useState } from "react";

import { Input } from "@/components/ui/input";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { cn } from "@/lib/utils";

interface PropFieldProps {
  name: string;
  schema: Record<string, unknown>;
  value: unknown;
  error?: string;
  onChange: (value: unknown) => void;
}

const isColorField = (
  name: string,
  schema: Record<string, unknown>
): boolean => {
  const nameLower = name.toLowerCase();
  return (
    (nameLower.includes("color") || nameLower.includes("colour")) &&
    typeof schema.default === "string" &&
    (schema.default as string).startsWith("#")
  );
};

const resolveValue = (
  value: unknown,
  schema: Record<string, unknown>
): unknown => {
  if (value !== undefined && value !== null) {
    return value;
  }
  return schema.default;
};

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
    <label
      htmlFor={`prop-${name}`}
      className="mb-1 block text-xs font-medium text-content-secondary"
    >
      {label}
    </label>
    {children}
    {error ? (
      <p className="mt-1 text-[11px] leading-tight text-danger">{error}</p>
    ) : null}
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
}) => (
  <div className="mb-3">
    <label
      htmlFor={`prop-${name}`}
      className="mb-1 block text-xs font-medium text-content-secondary"
    >
      {label}
    </label>
    <div className="flex items-center gap-2">
      <Popover>
        <PopoverTrigger
          className="h-8 w-8 cursor-pointer rounded-sm border border-border p-0"
          style={{ backgroundColor: value }}
          title={value}
        />
        <PopoverContent
          side="left"
          align="start"
          sideOffset={8}
          className="flex w-auto flex-col gap-3 p-3"
        >
          <input
            type="color"
            value={value}
            onChange={(e) => onChange(e.target.value)}
            className="h-40 w-40 cursor-pointer rounded-sm border-0 p-0"
          />
          <Input
            type="text"
            value={value}
            onChange={(e) => onChange(e.target.value)}
            className="font-mono text-xs"
            placeholder="#000000"
          />
        </PopoverContent>
      </Popover>
      <Input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="flex-1 font-mono"
      />
    </div>
  </div>
);

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
  <FieldWrapper name={name} label={label}>
    <select
      id={`prop-${name}`}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="field-input cursor-pointer appearance-none select-chevron"
    >
      {options.map((opt) => (
        <option key={opt} value={opt}>
          {opt}
        </option>
      ))}
    </select>
  </FieldWrapper>
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
    const pct = ((numValue - min) / (max - min)) * 100;
    return (
      <FieldWrapper name={name} label={label} error={error}>
        <div className="flex items-center gap-2">
          <input
            id={`prop-${name}`}
            type="range"
            min={min}
            max={max}
            step="1"
            value={numValue}
            onChange={(e) => onChange(Number(e.target.value))}
            className="range-slider flex-1"
            style={{
              backgroundSize: `${pct}% 100%`,
            }}
          />
          <span className="min-w-[32px] text-right font-mono text-xs text-content-tertiary">
            {String(numValue)}
          </span>
        </div>
      </FieldWrapper>
    );
  }

  return (
    <FieldWrapper name={name} label={label} error={error}>
      <input
        id={`prop-${name}`}
        type="number"
        min={min}
        max={max}
        value={numValue}
        onChange={(e) => onChange(Number(e.target.value))}
        className="field-input"
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
}) => {
  const inputRef = useRef<HTMLInputElement>(null);
  const [visualState, setVisualState] = useState(value);

  return (
    <div className="mb-3 flex items-center justify-between">
      <label
        htmlFor={`prop-${name}`}
        className="text-xs font-medium text-content-secondary"
      >
        {label}
      </label>
      <button
        type="button"
        role="switch"
        aria-checked={value}
        aria-label={label}
        className={cn(
          "relative inline-flex h-5 w-9 shrink-0 cursor-pointer items-center rounded-full border-2 border-transparent transition-colors",
          value ? "bg-accent" : "bg-surface-hover hover:bg-surface-tertiary"
        )}
        onClick={() => {
          const next = !value;
          setVisualState(next);
          onChange(next);
        }}
        data-state={value ? "checked" : "unchecked"}
      >
        <span
          className={cn(
            "pointer-events-none block h-3.5 w-3.5 rounded-full bg-white shadow-sm transition-transform",
            value ? "translate-x-4" : "translate-x-0"
          )}
        />
      </button>
      <input
        ref={inputRef}
        id={`prop-${name}`}
        type="checkbox"
        checked={visualState}
        onChange={(e) => onChange(e.target.checked)}
        className="sr-only"
      />
    </div>
  );
};

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
      <label className="mb-1 block text-xs font-medium text-content-secondary">
        {label}
      </label>
      {currentValue.length > 0 ? (
        <div className="mb-1.5 flex flex-wrap gap-1">
          {currentValue.map((n, i) => (
            <span
              key={`${String(n)}-${i}`}
              className="inline-flex items-center gap-1 rounded-[10px] bg-accent-muted px-2 py-0.5 text-[11px] font-medium text-accent-hover"
            >
              {String(n)}
              <button
                type="button"
                aria-label={`Remove ${String(n)}`}
                className="ml-0.5 flex h-3.5 w-3.5 cursor-pointer items-center justify-center rounded-full border-none bg-transparent p-0 text-accent-hover/60 transition-colors hover:text-danger"
                onClick={() => {
                  const next = [...currentValue];
                  next.splice(i, 1);
                  onChange(next);
                }}
              >
                <X size={10} />
              </button>
            </span>
          ))}
        </div>
      ) : null}
      <Input
        type="text"
        placeholder="e.g. 30, 45, 25, 60..."
        value={raw}
        onChange={(e) => setRaw(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            e.preventDefault();
            commitRaw(e.currentTarget.value);
          }
        }}
        onBlur={() => {
          if (raw.trim()) {
            commitRaw(raw);
          }
        }}
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
      <label className="mb-1 block text-xs font-medium text-content-secondary">
        {label}
      </label>
      {currentValue.length > 0 ? (
        <div className="mb-1.5 flex flex-wrap gap-1">
          {currentValue.map((tag, i) => (
            <span
              key={`${tag}-${i}`}
              className="inline-flex items-center gap-1 rounded-[10px] bg-accent-muted px-2 py-0.5 text-[11px] font-medium text-accent-hover"
            >
              {tag}
              <button
                type="button"
                aria-label={`Remove ${tag}`}
                className="ml-0.5 flex h-3.5 w-3.5 cursor-pointer items-center justify-center rounded-full border-none bg-transparent p-0 text-accent-hover/60 transition-colors hover:text-danger"
                onClick={() => {
                  const next = [...currentValue];
                  next.splice(i, 1);
                  onChange(next);
                }}
              >
                <X size={10} />
              </button>
            </span>
          ))}
        </div>
      ) : null}
      <Input
        type="text"
        placeholder="Add item and press Enter..."
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
        value={value as number[] | undefined}
        onChange={onChange as (value: number[]) => void}
      />
    );
  }

  return (
    <StringArrayField
      label={label}
      value={value as string[] | undefined}
      onChange={onChange as (value: string[]) => void}
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
  const type = schema.type as string;
  const currentValue = resolveValue(value, schema);
  const enumValues = schema.enum as string[] | undefined;

  if (isColorField(name, schema)) {
    return (
      <ColorField
        name={name}
        label={label}
        value={(currentValue ?? "#000000") as string}
        onChange={onChange as (value: string) => void}
      />
    );
  }

  if (type === "string" && enumValues?.length) {
    return (
      <EnumField
        name={name}
        label={label}
        value={String(currentValue ?? enumValues[0])}
        options={enumValues}
        onChange={onChange as (value: string) => void}
      />
    );
  }

  if (type === "number") {
    return (
      <NumberField
        name={name}
        label={label}
        value={currentValue}
        schema={schema}
        error={error}
        onChange={onChange as (value: number) => void}
      />
    );
  }

  if (type === "boolean") {
    return (
      <BooleanField
        name={name}
        label={label}
        value={Boolean(currentValue)}
        onChange={onChange as (value: boolean) => void}
      />
    );
  }

  if (type === "array") {
    return (
      <ArrayField
        label={label}
        value={currentValue}
        schema={schema}
        onChange={onChange}
      />
    );
  }

  const isLongText = ((schema.description as string) ?? "").length > 60;

  return (
    <FieldWrapper name={name} label={label} error={error}>
      {isLongText ? (
        <textarea
          id={`prop-${name}`}
          value={(currentValue as string) ?? ""}
          onChange={(e) => onChange(e.target.value)}
          rows={3}
          className={cn("field-input resize-y", error && "border-danger")}
        />
      ) : (
        <Input
          id={`prop-${name}`}
          type="text"
          value={(currentValue as string) ?? ""}
          onChange={(e) => onChange(e.target.value)}
          className={cn(error && "border-danger")}
        />
      )}
    </FieldWrapper>
  );
};
