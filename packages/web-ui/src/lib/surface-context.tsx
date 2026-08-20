"use client";

import { createContext, useContext, useMemo } from "react";
import type { ReactNode } from "react";

const SurfaceContext = createContext<number>(1);

export const useSurface = (): number => useContext(SurfaceContext);

export const SurfaceProvider = ({
  value,
  children,
}: {
  value: number;
  children: ReactNode;
}) => {
  const clampedValue = useMemo(() => Math.max(1, Math.min(8, value)), [value]);
  return (
    <SurfaceContext.Provider value={clampedValue}>
      {children}
    </SurfaceContext.Provider>
  );
};
