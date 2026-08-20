import { useCallback, useState } from "react";

import {
  defaultBindingAsString,
  loadStoredBindings,
  saveStoredBindings,
} from "./bindings";
import type { CommandDefinition } from "./types";

/**
 * Owns user-customized keyboard bindings, layered over each command's
 * `defaultBinding`. Overrides persist to localStorage so rebinding survives
 * a reload, independent of the app's own state persistence.
 */
export const useCommandBindings = () => {
  const [overrides, setOverrides] = useState<Record<string, string>>(() =>
    loadStoredBindings()
  );

  const resolve = useCallback(
    (command: CommandDefinition): string =>
      overrides[command.id] ?? defaultBindingAsString(command),
    [overrides]
  );

  const setBinding = useCallback((commandId: string, binding: string) => {
    setOverrides((prev) => {
      const next = { ...prev, [commandId]: binding };
      saveStoredBindings(next);
      return next;
    });
  }, []);

  const resetBinding = useCallback((commandId: string) => {
    setOverrides((prev) => {
      if (!(commandId in prev)) {
        return prev;
      }
      const { [commandId]: _removed, ...rest } = prev;
      saveStoredBindings(rest);
      return rest;
    });
  }, []);

  const isCustomized = useCallback(
    (commandId: string) => commandId in overrides,
    [overrides]
  );

  return { isCustomized, resetBinding, resolve, setBinding };
};
