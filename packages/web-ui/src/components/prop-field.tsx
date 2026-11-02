import { useRef } from "react";
import type * as React from "react";

import { ColorInput } from "@/components/ui/color-picker";
import { Input } from "@/components/ui/input";
import { Segmented } from "@/components/ui/segmented";
import {
  Select,
  SelectItem,
  SelectPopup,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { fieldHint, labelFromKey } from "@/lib/field-label";
import type { ListOp } from "@/lib/list-ops";
import { resolveNumberStep, scrubValue } from "@/lib/number-field";
import { readFieldLabel, resolveFieldKind } from "@/lib/resolve-field-kind";

import { FieldRow } from "./field-row";
import { ObjectListField, PrimitiveListField } from "./list-fields";
import { NumberInput } from "./number-input";

/**
 * How fields write back, by path, so a list item's field (`stats.1.label`)
 * goes through the same door as a top-level one and the studio can decide
 * whether an edit is the base value or one locale's override.
 */
export interface FieldEditor {
  change: (path: string, value: unknown) => void;
  /** Adds, removes or reorders the items of the list at `path`. */
  listOp: (path: string, op: ListOp) => void;
  /** The locale the value at `path` is edited for, when it is per-locale. */
  localeFor: (path: string) => string | undefined;
}

interface PropFieldProps {
  /** Dotted path of the field; the last segment is its key. */
  path: string;
  schema: Record<string, unknown>;
  value: unknown;
  /** Errors keyed by path; a field reads its own and its children's. */
  errors?: Record<string, string>;
  /** Whether the value differs from the default; shows the reset dot. */
  modified?: boolean;
  onReset?: () => void;
  editor: FieldEditor;
}

/** What every field renderer needs besides its value. */
interface FieldChrome {
  id: string;
  label: string;
  hint?: string;
  error?: string;
  modified?: boolean;
  onReset?: () => void;
  locale?: string;
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

/** A select with at most this many options, each this short, is drawn as a segmented control. */
const SEGMENTED_MAX_OPTIONS = 4;
const SEGMENTED_MAX_LENGTH = 10;

/** Our Slider wrapper types onValueChange as `number | readonly number[]`
 * regardless of what's passed in (it's not generic over its own props) —
 * every usage here is a single-thumb slider, so normalize back to a number. */
const asSingleValue = (value: number | readonly number[]): number =>
  Array.isArray(value) ? value[0] : (value as number);

const ColorField = ({
  id,
  label,
  value,
  onChange,
  ...chrome
}: FieldChrome & { value: string; onChange: (value: string) => void }) => (
  <FieldRow controlId={id} label={label} layout="inline" {...chrome}>
    <ColorInput id={id} label={label} onChange={onChange} value={value} />
  </FieldRow>
);

const EnumField = ({
  id,
  label,
  value,
  options,
  onChange,
  ...chrome
}: FieldChrome & {
  value: string;
  options: string[];
  onChange: (value: string) => void;
}) => {
  const segmented =
    options.length <= SEGMENTED_MAX_OPTIONS &&
    options.every((option) => option.length <= SEGMENTED_MAX_LENGTH);

  return (
    <FieldRow controlId={id} label={label} layout="inline" {...chrome}>
      {segmented ? (
        <Segmented
          id={id}
          label={label}
          onValueChange={onChange}
          options={options}
          value={value}
        />
      ) : (
        <Select
          onValueChange={(next) => onChange(next as string)}
          value={value}
        >
          <SelectTrigger className="w-full" id={id} size="sm">
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
      )}
    </FieldRow>
  );
};

/** Drag the label sideways to change the value, like design tools do. */
const useScrub = (
  value: number,
  schema: Record<string, unknown>,
  onChange: (value: number) => void
): React.ComponentProps<"label"> => {
  const startRef = useRef<{ x: number; value: number } | null>(null);
  const step = resolveNumberStep(schema);

  return {
    className: "cursor-ew-resize touch-none select-none",
    // A cancelled drag (the OS took the pointer) must end the scrub too, or
    // plain hovering would keep changing the value.
    onLostPointerCapture: () => {
      startRef.current = null;
    },
    onPointerDown: (event) => {
      event.currentTarget.setPointerCapture(event.pointerId);
      startRef.current = { value, x: event.clientX };
    },
    onPointerMove: (event) => {
      const start = startRef.current;
      if (!start) {
        return;
      }
      const next = scrubValue(
        start.value,
        event.clientX - start.x,
        step,
        schema
      );
      if (next !== value) {
        onChange(next);
      }
    },
    onPointerUp: () => {
      startRef.current = null;
    },
  };
};

const NumberField = ({
  id,
  label,
  value,
  schema,
  onChange,
  ...chrome
}: FieldChrome & {
  value: unknown;
  schema: Record<string, unknown>;
  onChange: (value: number) => void;
}) => {
  const min = schema.minimum as number | undefined;
  const max = schema.maximum as number | undefined;
  const hasRange = min !== undefined && max !== undefined;
  const numValue = (value as number | undefined) ?? min ?? 0;
  const scrub = useScrub(numValue, schema, onChange);

  return (
    <FieldRow
      controlId={id}
      label={label}
      labelProps={scrub}
      layout="inline"
      {...chrome}
    >
      <div className="flex items-center gap-2">
        {hasRange ? (
          <Slider
            aria-label={label}
            className="min-w-0 flex-1"
            max={max}
            min={min}
            onValueChange={(next) => onChange(asSingleValue(next))}
            step={resolveNumberStep(schema)}
            value={numValue}
          />
        ) : null}
        <NumberInput
          className={hasRange ? "w-16 shrink-0 font-mono" : "w-full font-mono"}
          id={id}
          label={`${label} value`}
          onChange={onChange}
          schema={schema}
          size="sm"
          value={numValue}
        />
      </div>
    </FieldRow>
  );
};

const BooleanField = ({
  id,
  label,
  value,
  onChange,
  ...chrome
}: FieldChrome & { value: boolean; onChange: (value: boolean) => void }) => (
  <FieldRow controlId={id} label={label} layout="inline" {...chrome}>
    <Switch checked={value} id={id} onCheckedChange={onChange} />
  </FieldRow>
);

type Item = Record<string, unknown>;

interface ListSchema {
  items?: Record<string, unknown> & { properties?: Record<string, Item> };
  minItems?: number;
  maxItems?: number;
}

const ArrayField = ({
  path,
  label,
  hint,
  error,
  modified,
  onReset,
  errors,
  value,
  schema,
  editor,
}: Omit<FieldChrome, "id" | "locale"> & {
  path: string;
  errors?: Record<string, string>;
  value: unknown;
  schema: Record<string, unknown>;
  editor: FieldEditor;
}) => {
  const chrome = { error, hint, label, modified, onReset, path };
  const onListOp = (op: ListOp) => editor.listOp(path, op);
  const itemsType = (schema.items as { type?: string } | undefined)?.type;
  const list = Array.isArray(value) ? value : [];

  if (itemsType === "object") {
    return (
      <ObjectListField
        {...chrome}
        errors={errors}
        items={list as Item[]}
        onListOp={onListOp}
        renderItemField={(field) => (
          // oxlint-disable-next-line no-use-before-define -- an item's fields are prop fields
          <PropField
            editor={editor}
            errors={errors}
            key={field.key}
            path={field.path}
            schema={field.schema}
            value={field.value}
          />
        )}
        schema={schema as ListSchema}
      />
    );
  }

  return (
    <PrimitiveListField
      {...chrome}
      items={list as (string | number)[]}
      kind={
        itemsType === "number" || itemsType === "integer" ? "number" : "text"
      }
      // Items share one schema, so the first item's answer is every item's.
      locale={editor.localeFor(`${path}.0`)}
      onItemChange={(index, next) => editor.change(`${path}.${index}`, next)}
      onListOp={onListOp}
      schema={schema as ListSchema}
    />
  );
};

export const PropField = ({
  path,
  schema,
  value,
  errors,
  modified,
  onReset,
  editor,
}: PropFieldProps) => {
  const onChange = (next: unknown) => editor.change(path, next);
  const name = path.slice(path.lastIndexOf(".") + 1);
  const label = readFieldLabel(schema) ?? labelFromKey(name);
  const chrome = {
    error: errors?.[path],
    hint: fieldHint(label, schema.description),
    id: `prop-${path}`,
    label,
    locale: editor.localeFor(path),
    modified,
    onReset,
  };
  const currentValue = resolveValue(value, schema);
  const fieldKind = resolveFieldKind(name, schema);

  switch (fieldKind.kind) {
    case "color": {
      return (
        <ColorField
          {...chrome}
          onChange={onChange as (value: string) => void}
          value={(currentValue ?? "#000000") as string}
        />
      );
    }

    case "enum": {
      return (
        <EnumField
          {...chrome}
          onChange={onChange as (value: string) => void}
          options={fieldKind.options}
          value={String(currentValue ?? fieldKind.options[0])}
        />
      );
    }

    case "number": {
      return (
        <NumberField
          {...chrome}
          onChange={onChange as (value: number) => void}
          schema={schema}
          value={currentValue}
        />
      );
    }

    case "boolean": {
      return (
        <BooleanField
          {...chrome}
          onChange={onChange as (value: boolean) => void}
          value={Boolean(currentValue)}
        />
      );
    }

    case "array": {
      return (
        <ArrayField
          editor={editor}
          error={chrome.error}
          errors={errors}
          hint={chrome.hint}
          label={label}
          modified={modified}
          onReset={onReset}
          path={path}
          schema={schema}
          value={currentValue}
        />
      );
    }

    case "text": {
      return (
        <FieldRow
          controlId={chrome.id}
          error={chrome.error}
          hint={chrome.hint}
          label={label}
          layout="stacked"
          locale={chrome.locale}
          modified={modified}
          onReset={onReset}
        >
          {fieldKind.multiline ? (
            <Textarea
              aria-invalid={chrome.error ? true : undefined}
              id={chrome.id}
              onChange={(e) => onChange(e.target.value)}
              rows={3}
              value={(currentValue as string) ?? ""}
            />
          ) : (
            <Input
              aria-invalid={chrome.error ? true : undefined}
              id={chrome.id}
              onChange={(e) => onChange(e.target.value)}
              size="sm"
              type="text"
              value={(currentValue as string) ?? ""}
            />
          )}
        </FieldRow>
      );
    }

    default: {
      const exhaustive: never = fieldKind;
      return exhaustive;
    }
  }
};
