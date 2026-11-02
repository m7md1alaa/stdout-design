/** Moves the item at `from` so it ends up at index `to`. Out-of-range moves are no-ops. */
export const moveItem = <T>(
  items: readonly T[],
  from: number,
  to: number
): T[] => {
  const next = [...items];
  if (
    from === to ||
    from < 0 ||
    to < 0 ||
    from >= next.length ||
    to >= next.length
  ) {
    return next;
  }
  const [moved] = next.splice(from, 1);
  next.splice(to, 0, moved as T);
  return next;
};

/** Inserts a copy of the item right after itself. */
export const duplicateItem = <T>(items: readonly T[], index: number): T[] => {
  const item = items[index];
  if (item === undefined) {
    return [...items];
  }
  const next = [...items];
  next.splice(index + 1, 0, structuredClone(item));
  return next;
};

export const removeItem = <T>(items: readonly T[], index: number): T[] =>
  items.filter((_, i) => i !== index);

/**
 * One structural change to a list. The studio applies it to the base
 * values and to every locale's overrides alike, so a per-locale edit stays
 * with its item when the list is reordered, grown or shrunk.
 */
export type ListOp =
  | { kind: "insert"; index: number; item: unknown }
  | { kind: "remove"; index: number }
  | { kind: "move"; from: number; to: number }
  | { kind: "duplicate"; index: number };

export const applyListOp = <T>(items: readonly T[], op: ListOp): T[] => {
  switch (op.kind) {
    case "insert": {
      const next = [...items];
      next.splice(op.index, 0, op.item as T);
      return next;
    }
    case "remove": {
      return removeItem(items, op.index);
    }
    case "move": {
      return moveItem(items, op.from, op.to);
    }
    case "duplicate": {
      return duplicateItem(items, op.index);
    }
    default: {
      const exhaustive: never = op;
      return exhaustive;
    }
  }
};

/**
 * Where a row that was at `openIndex` lands after `moveItem(from, to)`, so an
 * open row stays open when it, or a row around it, is reordered.
 */
export const indexAfterMove = (
  openIndex: number,
  from: number,
  to: number
): number => {
  if (openIndex === from) {
    return to;
  }
  if (from < openIndex && to >= openIndex) {
    return openIndex - 1;
  }
  if (from > openIndex && to <= openIndex) {
    return openIndex + 1;
  }
  return openIndex;
};

const SUMMARY_FIELDS = 2;
const SUMMARY_SEPARATOR = " · ";

/**
 * A one-line summary of a list item built from its first text and number
 * fields (`Coffee · 4.50`). Falls back to `Item N` when none has a value.
 */
export const summarizeItem = (
  item: Record<string, unknown>,
  index: number
): string => {
  const parts: string[] = [];
  for (const value of Object.values(item)) {
    if (parts.length === SUMMARY_FIELDS) {
      break;
    }
    const text = typeof value === "number" ? String(value) : (value as unknown);
    if (
      typeof text === "string" &&
      text.trim().length > 0 &&
      !text.startsWith("#")
    ) {
      parts.push(text.trim());
    }
  }
  return parts.length > 0 ? parts.join(SUMMARY_SEPARATOR) : `Item ${index + 1}`;
};
