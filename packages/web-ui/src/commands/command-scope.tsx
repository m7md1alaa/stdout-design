import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import type { ReactNode } from "react";

import type { CommandScope } from "./types";

interface CommandScopeContextValue {
  activeModalCount: number;
  openModal: (id: string) => void;
  closeModal: (id: string) => void;
}

const CommandScopeContext = createContext<CommandScopeContextValue | null>(
  null
);

/**
 * Tracks which modal-style surfaces (command palette, shortcuts dialog, ...)
 * are currently open. "canvas"-scoped commands are suppressed while any are
 * open; "global" commands (export, reset, etc.) stay live regardless.
 */
export const CommandScopeProvider = ({ children }: { children: ReactNode }) => {
  const [openModals, setOpenModals] = useState<ReadonlySet<string>>(
    () => new Set()
  );

  const openModal = useCallback((id: string) => {
    setOpenModals((prev) => (prev.has(id) ? prev : new Set(prev).add(id)));
  }, []);

  const closeModal = useCallback((id: string) => {
    setOpenModals((prev) => {
      if (!prev.has(id)) {
        return prev;
      }
      const next = new Set(prev);
      next.delete(id);
      return next;
    });
  }, []);

  const value = useMemo(
    () => ({ activeModalCount: openModals.size, closeModal, openModal }),
    [openModals.size, openModal, closeModal]
  );

  return (
    <CommandScopeContext.Provider value={value}>
      {children}
    </CommandScopeContext.Provider>
  );
};

const useCommandScopeContext = (): CommandScopeContextValue => {
  const ctx = useContext(CommandScopeContext);
  if (!ctx) {
    throw new Error(
      "useCommandScope must be used within a CommandScopeProvider"
    );
  }
  return ctx;
};

/** Registers `id` as an open modal for as long as `isOpen` is true. */
export const useModalScope = (id: string, isOpen: boolean): void => {
  const { openModal, closeModal } = useCommandScopeContext();
  useEffect(() => {
    if (!isOpen) {
      return;
    }
    openModal(id);
    return () => closeModal(id);
  }, [id, isOpen, openModal, closeModal]);
};

export const useIsScopeActive = (scope: CommandScope): boolean => {
  const { activeModalCount } = useCommandScopeContext();
  return scope === "global" || activeModalCount === 0;
};
