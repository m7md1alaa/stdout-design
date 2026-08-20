import type { Hotkey, HotkeySequence } from "@tanstack/hotkeys";
import { useHotkeys, useHotkeySequences } from "@tanstack/react-hotkeys";

import { deserializeSequence } from "./bindings";
import { useIsScopeActive } from "./command-scope";
import type { CommandDefinition } from "./types";

const isHotkeyCommand = (
  cmd: CommandDefinition
): cmd is Extract<CommandDefinition, { kind: "hotkey" }> =>
  cmd.kind === "hotkey";

const isSequenceCommand = (
  cmd: CommandDefinition
): cmd is Extract<CommandDefinition, { kind: "sequence" }> =>
  cmd.kind === "sequence";

/**
 * Registers a set of app commands with TanStack Hotkeys, resolving each
 * command's live binding (default or user-customized) and scope on every
 * render. `suppressAll` disables every registration — used while a shortcut
 * is actively being re-recorded, so the old binding can't double-fire.
 */
export const useRegisterCommands = (
  commands: CommandDefinition[],
  resolveBinding: (command: CommandDefinition) => string,
  suppressAll = false
): void => {
  const globalActive = useIsScopeActive("global");
  const canvasActive = useIsScopeActive("canvas");
  const scopeActive: Record<string, boolean> = {
    canvas: canvasActive,
    global: globalActive,
  };

  useHotkeys(
    commands.filter(isHotkeyCommand).map((cmd) => ({
      callback: () => cmd.run(),
      // Bindings are dynamic (defaults or user-recorded, round-tripped
      // through localStorage as plain strings), so they can't carry the
      // library's literal `Hotkey` union type — trusted valid by construction.
      hotkey: resolveBinding(cmd) as Hotkey,
      options: {
        conflictBehavior: "warn" as const,
        enabled:
          !suppressAll && scopeActive[cmd.scope] && (cmd.isEnabled?.() ?? true),
        ignoreInputs: cmd.ignoreInputs,
      },
    }))
  );

  useHotkeySequences(
    commands.filter(isSequenceCommand).map((cmd) => ({
      callback: () => cmd.run(),
      options: {
        enabled:
          !suppressAll && scopeActive[cmd.scope] && (cmd.isEnabled?.() ?? true),
      },
      sequence: deserializeSequence(resolveBinding(cmd)) as HotkeySequence,
    }))
  );
};
