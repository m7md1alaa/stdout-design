import {
  ChevronRightIcon,
  CopyIcon,
  EllipsisIcon,
  GripVerticalIcon,
  PlusIcon,
  Trash2Icon,
  XIcon,
} from "lucide-react";
import { useState } from "react";
import type * as React from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Menu,
  MenuItem,
  MenuPopup,
  MenuSeparator,
  MenuTrigger,
} from "@/components/ui/menu";
import { useFocusAfterRemove } from "@/hooks/use-focus-after-remove";
import { useReorder } from "@/hooks/use-reorder";
import { indexAfterMove, summarizeItem } from "@/lib/list-ops";
import type { ListOp } from "@/lib/list-ops";
import { cn } from "@/lib/utils";

import { FieldRow } from "./field-row";
import { NumberInput } from "./number-input";

type Item = Record<string, unknown>;

interface ListSchema {
  items?: Record<string, unknown> & { properties?: Record<string, Item> };
  minItems?: number;
  maxItems?: number;
}

/** What every list needs from its field: label, hint, errors, and reset. */
interface ListChrome {
  path: string;
  label: string;
  hint?: string;
  error?: string;
  modified?: boolean;
  onReset?: () => void;
  /** The locale the list's text is edited for, when it differs per locale. */
  locale?: string;
}

const GripButton = (props: React.ComponentProps<"button">) => (
  <button
    className="text-muted-foreground hover:text-foreground focus-visible:ring-ring flex h-7 w-4 shrink-0 cursor-grab items-center justify-center rounded-sm outline-none focus-visible:ring-2 active:cursor-grabbing"
    type="button"
    {...props}
  >
    <GripVerticalIcon className="size-3.5" />
  </button>
);

const rowClassName =
  "relative rounded-md data-dragging:opacity-40 data-drop-target:before:bg-foreground data-drop-target:before:absolute data-drop-target:before:inset-x-0 data-drop-target:before:-top-px data-drop-target:before:h-0.5 data-drop-target:before:rounded-full";

/** "2 of 4" when the list has a maximum, otherwise just the count. */
const ListCount = ({ count, max }: { count: number; max: number }) => (
  <span className="text-muted-foreground font-mono text-xs tabular-nums">
    {Number.isFinite(max) ? `${count} of ${max}` : count}
  </span>
);

const AddButton = ({
  disabled,
  onClick,
}: {
  disabled: boolean;
  onClick: () => void;
}) => (
  <Button
    className="text-muted-foreground w-fit"
    data-list-add=""
    disabled={disabled}
    onClick={onClick}
    size="xs"
    variant="ghost"
  >
    <PlusIcon />
    Add
  </Button>
);

interface PrimitiveListProps extends ListChrome {
  kind: "text" | "number";
  items: (string | number)[];
  schema: ListSchema;
  /** Sets one item. */
  onItemChange: (index: number, value: string | number) => void;
  /** Adds, removes or reorders items. */
  onListOp: (op: ListOp) => void;
}

/**
 * A list of strings or numbers: one editable input per item, a grip to
 * reorder, remove on hover, and Add at the end. Both kinds behave alike.
 */
export const PrimitiveListField = ({
  path,
  label,
  hint,
  error,
  modified,
  onReset,
  locale,
  kind,
  items,
  schema,
  onItemChange,
  onListOp,
}: PrimitiveListProps) => {
  const { minItems = 0, maxItems = Number.POSITIVE_INFINITY } = schema;
  const atMin = items.length <= minItems;
  const itemSchema = schema.items ?? {};
  const reorder = useReorder((from, to) =>
    onListOp({ from, kind: "move", to })
  );
  const { containerRef, focusAfterRemove } = useFocusAfterRemove();

  const add = () => {
    const last = items.at(-1);
    onListOp({
      index: items.length,
      item: kind === "number" ? ((last as number | undefined) ?? 0) : "",
      kind: "insert",
    });
  };

  return (
    <FieldRow
      actions={<ListCount count={items.length} max={maxItems} />}
      controlId={`prop-${path}`}
      error={error}
      hint={hint}
      label={label}
      layout="stacked"
      locale={locale}
      modified={modified}
      onReset={onReset}
    >
      <div
        className="flex flex-col gap-1"
        id={`prop-${path}`}
        ref={containerRef}
      >
        {items.map((item, index) => (
          <div
            className={cn("group flex items-center gap-1", rowClassName)}
            // Items carry no id; the position is the identity the schema gives them.
            // oxlint-disable-next-line react/no-array-index-key
            key={index}
            {...reorder.rowProps(index)}
          >
            <GripButton {...reorder.gripProps(index, items.length)} />
            {kind === "number" ? (
              <NumberInput
                className="flex-1 font-mono"
                label={`${label} ${index + 1}`}
                onChange={(next) => onItemChange(index, next)}
                schema={itemSchema}
                size="sm"
                value={item as number}
              />
            ) : (
              <Input
                aria-label={`${label} ${index + 1}`}
                className="flex-1"
                onChange={(e) => onItemChange(index, e.target.value)}
                size="sm"
                type="text"
                value={item as string}
              />
            )}
            <button
              aria-label={`Remove ${label} ${index + 1}`}
              data-row-action={index}
              className="text-muted-foreground hover:text-destructive-foreground focus-visible:ring-ring flex size-6 shrink-0 cursor-pointer items-center justify-center rounded-sm opacity-0 transition-opacity duration-150 outline-none group-focus-within:opacity-100 group-hover:opacity-100 focus-visible:ring-2 disabled:invisible"
              // At the minimum the button hides but keeps its slot, so rows don't shift.
              disabled={atMin}
              onClick={() => {
                onListOp({ index, kind: "remove" });
                focusAfterRemove(index, items.length - 1);
              }}
              type="button"
            >
              <XIcon className="size-3.5" />
            </button>
          </div>
        ))}
        <AddButton disabled={items.length >= maxItems} onClick={add} />
      </div>
    </FieldRow>
  );
};

interface ObjectListProps extends ListChrome {
  items: Item[];
  schema: ListSchema;
  errors?: Record<string, string>;
  /** Adds, removes or reorders items. */
  onListOp: (op: ListOp) => void;
  /** Renders one field of an item, edited by its own path (`stats.1.label`); list items reuse every field type. */
  renderItemField: (field: {
    key: string;
    path: string;
    schema: Item;
    value: unknown;
  }) => React.ReactNode;
}

const defaultItem = (properties: [string, Item][]): Item =>
  Object.fromEntries(properties.map(([key, prop]) => [key, prop.default]));

/**
 * A list of objects: collapsed rows with a one-line summary, one open at a
 * time. Rows reorder by drag (or Alt+arrows on the grip), and a row menu
 * offers Duplicate, Move up, Move down and Delete.
 */
export const ObjectListField = ({
  path,
  label,
  hint,
  error,
  modified,
  onReset,
  items,
  schema,
  errors,
  onListOp,
  renderItemField,
}: ObjectListProps) => {
  const [openIndex, setOpenIndex] = useState<number | null>(null);
  const properties = Object.entries(schema.items?.properties ?? {});
  const { minItems = 0, maxItems = Number.POSITIVE_INFINITY } = schema;
  const atMax = items.length >= maxItems;
  const atMin = items.length <= minItems;

  const move = (from: number, to: number) => {
    onListOp({ from, kind: "move", to });
    setOpenIndex((current) =>
      current === null ? null : indexAfterMove(current, from, to)
    );
  };
  const reorder = useReorder(move);
  const { containerRef, focusAfterRemove } = useFocusAfterRemove();

  const hasErrorWithin = (index: number): boolean =>
    Object.keys(errors ?? {}).some((key) =>
      key.startsWith(`${path}.${index}.`)
    );

  return (
    <FieldRow
      actions={<ListCount count={items.length} max={maxItems} />}
      controlId={`prop-${path}`}
      error={error}
      hint={hint}
      label={label}
      layout="stacked"
      modified={modified}
      onReset={onReset}
    >
      <div
        className="flex flex-col gap-1"
        id={`prop-${path}`}
        ref={containerRef}
      >
        {items.map((item, index) => {
          const open = openIndex === index || hasErrorWithin(index);
          return (
            <div
              className={cn("border-border rounded-md border", rowClassName)}
              // oxlint-disable-next-line react/no-array-index-key
              key={index}
              {...reorder.rowProps(index)}
            >
              <div className="group flex items-center gap-0.5 px-1">
                <GripButton {...reorder.gripProps(index, items.length)} />
                <button
                  aria-expanded={open}
                  className="focus-visible:ring-ring flex h-8 min-w-0 flex-1 cursor-pointer items-center gap-1.5 rounded-sm text-left text-xs outline-none focus-visible:ring-2"
                  onClick={() => setOpenIndex(open ? null : index)}
                  type="button"
                >
                  <ChevronRightIcon
                    className={cn(
                      "text-muted-foreground size-3.5 shrink-0 transition-transform duration-150",
                      open && "rotate-90"
                    )}
                  />
                  <span className="truncate">{summarizeItem(item, index)}</span>
                </button>
                <Menu>
                  <MenuTrigger
                    render={
                      <Button
                        aria-label={`Actions for item ${index + 1}`}
                        data-row-action={index}
                        size="icon-xs"
                        variant="ghost"
                      />
                    }
                  >
                    <EllipsisIcon />
                  </MenuTrigger>
                  <MenuPopup>
                    <MenuItem
                      disabled={atMax}
                      onClick={() => {
                        onListOp({ index, kind: "duplicate" });
                        setOpenIndex(index + 1);
                      }}
                    >
                      Duplicate
                      <CopyIcon className="size-3.5 opacity-60" />
                    </MenuItem>
                    <MenuItem
                      disabled={index === 0}
                      onClick={() => move(index, index - 1)}
                    >
                      Move up
                    </MenuItem>
                    <MenuItem
                      disabled={index === items.length - 1}
                      onClick={() => move(index, index + 1)}
                    >
                      Move down
                    </MenuItem>
                    <MenuSeparator />
                    <MenuItem
                      disabled={atMin}
                      onClick={() => {
                        onListOp({ index, kind: "remove" });
                        setOpenIndex(null);
                        focusAfterRemove(index, items.length - 1);
                      }}
                    >
                      Delete
                      <Trash2Icon className="size-3.5 opacity-60" />
                    </MenuItem>
                  </MenuPopup>
                </Menu>
              </div>
              {open ? (
                <div className="border-border border-t px-2 pb-1">
                  {properties.map(([key, propSchema]) =>
                    renderItemField({
                      key,
                      path: `${path}.${index}.${key}`,
                      schema: propSchema,
                      value: item[key],
                    })
                  )}
                </div>
              ) : null}
            </div>
          );
        })}
        <AddButton
          disabled={atMax}
          onClick={() => {
            onListOp({
              index: items.length,
              item: defaultItem(properties),
              kind: "insert",
            });
            setOpenIndex(items.length);
          }}
        />
      </div>
    </FieldRow>
  );
};
