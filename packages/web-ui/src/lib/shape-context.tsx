"use client";

import {
  createContext,
  useContext,
  useState,
  useEffect,
  useRef,
  useCallback,
  useMemo,
} from "react";
import type { ReactNode } from "react";

type ShapeVariant = "pill" | "rounded";

interface ShapeClasses {
  item: string;
  bg: string;
  focusRing: string;
  mergedBg: string;
  container: string;
  button: string;
  input: string;
  // Numeric counterparts of `bg` / `mergedBg`, in px. Needed where individual
  // corners are animated (e.g. the selected-background merge/split animation),
  // which requires per-corner numeric border-radii rather than a class.
  bgRadius: number;
  mergedRadius: number;
}

const shapeMap: Record<ShapeVariant, ShapeClasses> = {
  pill: {
    bg: "rounded-[20px]",
    bgRadius: 20,
    button: "rounded-[20px]",
    container: "rounded-3xl",
    focusRing: "rounded-[22px]",
    input: "rounded-[20px]",
    item: "rounded-[20px]",
    mergedBg: "rounded-2xl",
    // +2px over `item` because the focus ring sits 2px outside the element
    // (top/left -2, width/height +4); this keeps the corners concentric so a
    // pill element gets a pill ring (matches the rounded-mode 8px→10px bump).
    mergedRadius: 16,
  },
  rounded: {
    bg: "rounded-lg",
    bgRadius: 8,
    button: "rounded-lg",
    container: "rounded-xl",
    focusRing: "rounded-[10px]",
    input: "rounded-lg",
    item: "rounded-lg",
    mergedBg: "rounded-lg",
    mergedRadius: 8,
  },
};

interface ShapeContextValue {
  shape: ShapeVariant;
  setShape: (shape: ShapeVariant) => void;
  classes: ShapeClasses;
}

const ShapeContext = createContext<ShapeContextValue | null>(null);

const useShape = (): ShapeClasses => {
  const ctx = useContext(ShapeContext);
  if (!ctx) {
    return shapeMap.pill;
  }
  return ctx.classes;
};

const useShapeContext = () => {
  const ctx = useContext(ShapeContext);
  if (!ctx) {
    throw new Error("useShapeContext must be used within a ShapeProvider");
  }
  return ctx;
};

const ShapeProvider = ({
  children,
  defaultShape = "pill",
}: {
  children: ReactNode;
  defaultShape?: ShapeVariant;
}) => {
  const [activeShape, setActiveShape] = useState<ShapeVariant>(defaultShape);
  const transitionTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(
    null
  );

  // Run a state change under the `.transitioning` guard (added + reflow-flushed
  // first so the 180ms border-radius cross-fade applies). Clearing the previous
  // timeout first keeps a double-press from removing the class mid-fade.
  const transitionShape = useCallback((action: () => void) => {
    const root = document.documentElement;
    root.classList.add("transitioning");
    void root.offsetHeight;
    action();
    if (transitionTimeoutRef.current) {
      clearTimeout(transitionTimeoutRef.current);
    }
    transitionTimeoutRef.current = setTimeout(
      () => root.classList.remove("transitioning"),
      200
    );
  }, []);

  const setShape = useCallback(
    (next: ShapeVariant) => {
      transitionShape(() => setActiveShape(next));
    },
    [transitionShape]
  );

  // Publish the current element radius as a CSS custom property so plain-CSS
  // consumers that can't read React context stay in sync with the shape
  // system — e.g. the @layer base :focus-visible fallback ring in
  // globals.css. Set on <html> so portalled content sees it too.
  useEffect(() => {
    document.documentElement.style.setProperty(
      "--shape-input-radius",
      `${shapeMap[activeShape].bgRadius}px`
    );
  }, [activeShape]);

  const value = useMemo(
    () => ({ classes: shapeMap[activeShape], setShape, shape: activeShape }),
    [activeShape, setShape]
  );

  return (
    <ShapeContext.Provider value={value}>{children}</ShapeContext.Provider>
  );
};

export { ShapeProvider, useShape, useShapeContext, shapeMap };
export type { ShapeVariant, ShapeClasses };
