import { useCallback, useState } from "react";

import { findHotkeyCommand, formatCommandBinding } from "./bindings";
import type { AppCommandCallbacks } from "./command-definitions";
import { buildAppCommands } from "./command-definitions";
import { useModalScope } from "./command-scope";
import { useCommandBindings } from "./use-command-bindings";
import { useRegisterCommands } from "./use-register-commands";

/** What the app supplies — palette/shortcuts-dialog visibility is this hook's own concern. */
export type AppCommandActionCallbacks = Omit<
  AppCommandCallbacks,
  "openPalette" | "openShortcutsHelp"
>;

/**
 * Owns the command palette, keyboard-shortcuts dialog, and shortcut
 * registration as a single unit: state, modal scoping, binding overrides,
 * and hotkey wiring. Callers get back everything the UI needs and don't
 * have to know how any of it is assembled.
 */
export const useAppCommands = (callbacks: AppCommandActionCallbacks) => {
  const [isPaletteOpen, setIsPaletteOpen] = useState(false);
  const [isShortcutsOpen, setIsShortcutsOpen] = useState(false);
  const [recordingIds, setRecordingIds] = useState<Set<string>>(
    () => new Set()
  );

  useModalScope("command-palette", isPaletteOpen);
  useModalScope("shortcuts-dialog", isShortcutsOpen);

  const setRowRecording = useCallback((id: string, recording: boolean) => {
    setRecordingIds((prev) => {
      const next = new Set(prev);
      if (recording) {
        next.add(id);
      } else {
        next.delete(id);
      }
      return next;
    });
  }, []);

  const commands = buildAppCommands({
    ...callbacks,
    openPalette: () => setIsPaletteOpen((open) => !open),
    openShortcutsHelp: () => setIsShortcutsOpen(true),
  });

  const bindings = useCommandBindings();
  useRegisterCommands(commands, bindings.resolve, recordingIds.size > 0);

  const shortcutsHelpCommand = findHotkeyCommand(
    commands,
    "open-shortcuts-help"
  );
  const shortcutsHelpLabel = shortcutsHelpCommand
    ? formatCommandBinding(bindings.resolve, shortcutsHelpCommand)
    : null;

  return {
    bindings,
    commands,
    handlePaletteOpenChange: setIsPaletteOpen,
    handleShortcutsOpenChange: setIsShortcutsOpen,
    isPaletteOpen,
    isShortcutsOpen,
    recordingIds,
    setRowRecording,
    shortcutsHelpLabel,
  };
};

export type AppCommandsState = ReturnType<typeof useAppCommands>;
