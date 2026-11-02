import { useEffect, useId, useRef, useState } from "react";
import type * as React from "react";

/**
 * Drag-to-reorder for a list of rows, plus the keyboard equivalent: focus
 * the grip and press Alt+Up or Alt+Down. After a keyboard move the grip
 * follows the row, so the key can be pressed again.
 */
export const useReorder = (onMove: (from: number, to: number) => void) => {
  const listId = useId();
  const [dragIndex, setDragIndex] = useState<number | null>(null);
  const [overIndex, setOverIndex] = useState<number | null>(null);
  const focusIndexRef = useRef<number | null>(null);

  // After a keyboard move, once the rows have re-rendered in their new order.
  useEffect(() => {
    if (focusIndexRef.current === null) {
      return;
    }
    document
      .querySelector<HTMLElement>(
        `[data-grip="${listId}-${focusIndexRef.current}"]`
      )
      ?.focus();
    focusIndexRef.current = null;
  });

  const reset = () => {
    setDragIndex(null);
    setOverIndex(null);
  };

  const gripProps = (index: number, count: number) => ({
    "aria-label": "Reorder. Drag, or press Alt and an arrow key.",
    "data-grip": `${listId}-${index}`,
    draggable: true,
    onDragEnd: reset,
    onDragStart: (event: React.DragEvent<HTMLElement>) => {
      event.dataTransfer.effectAllowed = "move";
      event.dataTransfer.setData("text/plain", String(index));
      const row = event.currentTarget.closest("[data-reorder-row]");
      if (row) {
        event.dataTransfer.setDragImage(row, 0, 0);
      }
      setDragIndex(index);
    },
    onKeyDown: (event: React.KeyboardEvent<HTMLElement>) => {
      if (!event.altKey) {
        return;
      }
      let target: number | null = null;
      if (event.key === "ArrowUp") {
        target = index - 1;
      } else if (event.key === "ArrowDown") {
        target = index + 1;
      }
      if (target === null || target < 0 || target >= count) {
        return;
      }
      event.preventDefault();
      onMove(index, target);
      focusIndexRef.current = target;
    },
  });

  const rowProps = (index: number) => ({
    "data-dragging": dragIndex === index ? "" : undefined,
    "data-drop-target":
      dragIndex !== null && overIndex === index && dragIndex !== index
        ? ""
        : undefined,
    "data-reorder-row": "",
    onDragOver: (event: React.DragEvent<HTMLElement>) => {
      if (dragIndex === null) {
        return;
      }
      event.preventDefault();
      setOverIndex(index);
    },
    onDrop: (event: React.DragEvent<HTMLElement>) => {
      event.preventDefault();
      if (dragIndex !== null && dragIndex !== index) {
        onMove(dragIndex, index);
      }
      reset();
    },
  });

  return { gripProps, rowProps };
};
