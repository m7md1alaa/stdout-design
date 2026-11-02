import { useEffect, useState } from "react";

interface ElementSize {
  width: number;
  height: number;
}

/**
 * Tracks an element's content-box size. Returns a callback ref rather than
 * taking a ref object, so it still works when the element mounts later than
 * the component that owns the hook (the canvas renders an empty state first).
 */
export const useElementSize = <T extends HTMLElement>() => {
  const [element, setElement] = useState<T | null>(null);
  const [size, setSize] = useState<ElementSize>({ height: 0, width: 0 });

  useEffect(() => {
    if (!element) {
      return;
    }

    const observer = new ResizeObserver(([entry]) => {
      if (!entry) {
        return;
      }
      const { width, height } = entry.contentRect;
      setSize((prev) =>
        prev.width === width && prev.height === height
          ? prev
          : { height, width }
      );
    });
    observer.observe(element);

    return () => observer.disconnect();
  }, [element]);

  return { ...size, ref: setElement };
};
