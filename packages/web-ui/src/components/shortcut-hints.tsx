import { findHotkeyCommand, formatCommandBinding } from "@/commands/bindings";
import type { CommandDefinition, HotkeyCommandDefinition } from "@/commands/types";
import { useModKeyHeld } from "@/commands/use-mod-key-held";

interface ShortcutHintsProps {
  commands: CommandDefinition[];
  ids: string[];
  resolveBinding: (command: CommandDefinition) => string;
}

/** Reveals a row of shortcut hints while the platform's Mod key is held. */
export const ShortcutHints = ({
  commands,
  ids,
  resolveBinding,
}: ShortcutHintsProps) => {
  const modHeld = useModKeyHeld();

  if (!modHeld) {
    return null;
  }

  const items = ids
    .map((id) => findHotkeyCommand(commands, id))
    .filter((cmd): cmd is HotkeyCommandDefinition => cmd !== undefined);

  if (items.length === 0) {
    return null;
  }

  return (
    <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-content-tertiary">
      {items.map((cmd) => (
        <span className="inline-flex items-center gap-1" key={cmd.id}>
          <kbd className="rounded border border-border bg-surface-tertiary px-1 py-0.5 font-mono text-[10px] text-content-secondary">
            {formatCommandBinding(resolveBinding, cmd)}
          </kbd>
          {cmd.label}
        </span>
      ))}
    </div>
  );
};
