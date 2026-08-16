import { formatForDisplay } from "@tanstack/react-hotkeys";

import { logWarn } from "../lib/logger";
import type { CommandDefinition } from "./types";

const STORAGE_KEY = "stdout-design:web-ui:bindings:v1";
const SEQUENCE_SEPARATOR = " ";

export const deserializeSequence = (stored: string): string[] =>
  stored.split(SEQUENCE_SEPARATOR).filter(Boolean);

export const defaultBindingAsString = (command: CommandDefinition): string =>
  command.kind === "sequence"
    ? command.defaultBinding.join(SEQUENCE_SEPARATOR)
    : command.defaultBinding;

/** Looks up a command by id, narrowed to the hotkey (non-sequence) variant. */
export const findHotkeyCommand = (
  commands: CommandDefinition[],
  id: string
): Extract<CommandDefinition, { kind: "hotkey" }> | undefined => {
  const command = commands.find((cmd) => cmd.id === id);
  return command?.kind === "hotkey" ? command : undefined;
};

/** Resolves a command's live binding and formats it for on-screen display. */
export const formatCommandBinding = (
  resolveBinding: (command: CommandDefinition) => string,
  command: CommandDefinition
): string => formatForDisplay(resolveBinding(command));

export const loadStoredBindings = (): Record<string, string> => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      return {};
    }
    const parsed = JSON.parse(raw) as unknown;
    if (!parsed || typeof parsed !== "object") {
      return {};
    }
    const result: Record<string, string> = {};
    for (const [key, value] of Object.entries(
      parsed as Record<string, unknown>
    )) {
      if (typeof value === "string") {
        result[key] = value;
      }
    }
    return result;
  } catch (error) {
    logWarn("Failed to read stored keyboard shortcut bindings", {
      error: String(error),
    });
    return {};
  }
};

export const saveStoredBindings = (bindings: Record<string, string>): void => {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(bindings));
  } catch (error) {
    logWarn("Failed to save keyboard shortcut bindings", {
      error: String(error),
    });
  }
};
