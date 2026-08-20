import { formatForDisplay } from "@tanstack/react-hotkeys";
import { useMemo, useState } from "react";

import type { CommandDefinition } from "@/commands/types";
import {
  Command,
  CommandDialog,
  CommandDialogPopup,
  CommandDialogPrimitive,
  CommandEmpty,
  CommandGroup,
  CommandGroupLabel,
  CommandInput,
  CommandItem,
  CommandList,
  CommandPanel,
  CommandShortcut,
} from "@/components/ui/command";

interface TemplateOption {
  id: string;
  description: string;
}

interface PaletteItem {
  key: string;
  label: string;
  description?: string;
  shortcut?: string;
  run: () => void;
}

interface CommandPaletteProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  commands: CommandDefinition[];
  templates: TemplateOption[];
  currentTemplateId: string | null;
  resolveBinding: (command: CommandDefinition) => string;
  onSelectTemplate: (id: string) => void;
}

export const CommandPalette = ({
  open,
  onOpenChange,
  commands,
  templates,
  currentTemplateId,
  resolveBinding,
  onSelectTemplate,
}: CommandPaletteProps) => {
  const [query, setQuery] = useState("");

  // Reset search whenever the dialog transitions to open, without an effect
  // (this component stays mounted across opens, so state doesn't reset on
  // its own). See "you might not need an effect" in the React docs.
  const [wasOpen, setWasOpen] = useState(open);
  if (open !== wasOpen) {
    setWasOpen(open);
    if (open) {
      setQuery("");
    }
  }

  const commandItems = useMemo<PaletteItem[]>(
    () =>
      commands
        .filter((cmd) => cmd.kind === "hotkey")
        .map((cmd) => ({
          description: cmd.description,
          key: `command:${cmd.id}`,
          label: cmd.label,
          run: cmd.run,
          shortcut: formatForDisplay(resolveBinding(cmd)),
        })),
    [commands, resolveBinding]
  );

  const templateItems = useMemo<PaletteItem[]>(
    () =>
      templates.map((t) => ({
        description:
          t.id === currentTemplateId ? "Currently selected" : t.description,
        key: `template:${t.id}`,
        label: `Switch to: ${t.id}`,
        run: () => onSelectTemplate(t.id),
      })),
    [templates, currentTemplateId, onSelectTemplate]
  );

  const q = query.trim().toLowerCase();
  const matches = (item: PaletteItem) =>
    !q ||
    item.label.toLowerCase().includes(q) ||
    (item.description ?? "").toLowerCase().includes(q);

  const filteredCommands = commandItems.filter(matches);
  const filteredTemplates = templateItems.filter(matches);

  const runItem = (item: PaletteItem) => {
    item.run();
    onOpenChange(false);
  };

  return (
    <CommandDialog onOpenChange={onOpenChange} open={open}>
      <CommandDialogPopup>
        <CommandDialogPrimitive.Title className="sr-only">
          Command palette
        </CommandDialogPrimitive.Title>
        <Command onValueChange={setQuery} value={query}>
          <CommandInput placeholder="Search commands and templates..." />
          <CommandPanel>
            <CommandList>
              <CommandEmpty>No matches</CommandEmpty>
              {filteredCommands.length > 0 ? (
                <CommandGroup>
                  <CommandGroupLabel>Commands</CommandGroupLabel>
                  {filteredCommands.map((item) => (
                    <CommandItem
                      key={item.key}
                      onClick={() => runItem(item)}
                      value={item.key}
                    >
                      <div className="flex min-w-0 flex-col">
                        <span className="truncate">{item.label}</span>
                        {item.description ? (
                          <span className="truncate text-content-tertiary text-xs">
                            {item.description}
                          </span>
                        ) : null}
                      </div>
                      {item.shortcut ? (
                        <CommandShortcut>{item.shortcut}</CommandShortcut>
                      ) : null}
                    </CommandItem>
                  ))}
                </CommandGroup>
              ) : null}
              {filteredTemplates.length > 0 ? (
                <CommandGroup>
                  <CommandGroupLabel>Templates</CommandGroupLabel>
                  {filteredTemplates.map((item) => (
                    <CommandItem
                      key={item.key}
                      onClick={() => runItem(item)}
                      value={item.key}
                    >
                      <div className="flex min-w-0 flex-col">
                        <span className="truncate">{item.label}</span>
                        {item.description ? (
                          <span className="truncate text-content-tertiary text-xs">
                            {item.description}
                          </span>
                        ) : null}
                      </div>
                    </CommandItem>
                  ))}
                </CommandGroup>
              ) : null}
            </CommandList>
          </CommandPanel>
        </Command>
      </CommandDialogPopup>
    </CommandDialog>
  );
};
