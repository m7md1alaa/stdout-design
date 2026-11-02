import { useEffect, useRef } from "react";

/**
 * Keeps keyboard focus in a list when a row is removed. Removing the last
 * row unmounts the control that had focus, which drops focus to the page;
 * this moves it to the row that took its place, the row before it, or the
 * list's Add button when the list is now empty.
 *
 * Mark each row's control with `data-row-action={index}` and the Add button
 * with `data-list-add`, put `containerRef` on the list, and call
 * `focusAfterRemove(index, countAfter)` when removing.
 */
export const useFocusAfterRemove = () => {
  const containerRef = useRef<HTMLDivElement>(null);
  const pendingRef = useRef<string | null>(null);

  // Runs after the list re-renders without the removed row.
  useEffect(() => {
    const selector = pendingRef.current;
    if (selector === null) {
      return;
    }
    pendingRef.current = null;
    containerRef.current?.querySelector<HTMLElement>(selector)?.focus();
  });

  const focusAfterRemove = (index: number, countAfter: number) => {
    pendingRef.current =
      countAfter === 0
        ? "[data-list-add]"
        : `[data-row-action="${Math.min(index, countAfter - 1)}"]`;
  };

  return { containerRef, focusAfterRemove };
};
