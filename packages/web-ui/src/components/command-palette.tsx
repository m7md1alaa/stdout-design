import { formatForDisplay } from "@tanstack/react-hotkeys";
import { useMemo, useState } from "react";

import type { CommandDefinition } from "@/commands/types";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";

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
  const [highlighted, setHighlighted] = useState(0);

  // Reset search/selection whenever the dialog transitions to open, without
  // an effect (this component stays mounted across opens, so state doesn't
  // reset on its own). See "you might not need an effect" in the React docs.
  const [wasOpen, setWasOpen] = useState(open);
  if (open !== wasOpen) {
    setWasOpen(open);
    if (open) {
      setQuery("");
      setHighlighted(0);
    }
  }

  const items = useMemo<PaletteItem[]>(() => {
    const commandItems: PaletteItem[] = commands
      .filter((cmd) => cmd.kind === "hotkey")
      .map((cmd) => ({
        description: cmd.description,
        key: `command:${cmd.id}`,
        label: cmd.label,
        run: cmd.run,
        shortcut: formatForDisplay(resolveBinding(cmd)),
      }));

    const templateItems: PaletteItem[] = templates.map((t) => ({
      description:
        t.id === currentTemplateId ? "Currently selected" : t.description,
      key: `template:${t.id}`,
      label: `Switch to: ${t.id}`,
      run: () => onSelectTemplate(t.id),
    }));

    const all = [...commandItems, ...templateItems];
    const q = query.trim().toLowerCase();
    if (!q) {
      return all;
    }
    return all.filter(
      (item) =>
        item.label.toLowerCase().includes(q) ||
        (item.description ?? "").toLowerCase().includes(q)
    );
  }, [
    commands,
    templates,
    currentTemplateId,
    resolveBinding,
    query,
    onSelectTemplate,
  ]);

  const runItem = (item: PaletteItem | undefined) => {
    if (!item) {
      return;
    }
    item.run();
    onOpenChange(false);
  };

  return (
    <Dialog onOpenChange={onOpenChange} open={open}>
      <DialogContent className="top-[20%] max-w-lg translate-y-0 p-0">
        <DialogTitle className="sr-only">Command palette</DialogTitle>
        <Input
          className="h-11 rounded-none border-0 border-border border-b px-4 text-sm focus-visible:ring-0"
          onChange={(e) => {
            setQuery(e.target.value);
            setHighlighted(0);
          }}
          onKeyDown={(e) => {
            if (e.key === "ArrowDown") {
              e.preventDefault();
              setHighlighted((i) => Math.min(i + 1, items.length - 1));
            } else if (e.key === "ArrowUp") {
              e.preventDefault();
              setHighlighted((i) => Math.max(i - 1, 0));
            } else if (e.key === "Enter") {
              e.preventDefault();
              runItem(items[highlighted]);
            }
          }}
          placeholder="Search commands and templates..."
          value={query}
        />
        {/* Custom rich listbox (descriptions + kbd hints) — native select/option can't render this. */}
        {/* oxlint-disable-next-line jsx-a11y/prefer-tag-over-role */}
        <div className="max-h-80 overflow-y-auto p-1.5" role="listbox">
          {items.length === 0 ? (
            <p className="px-3 py-6 text-center text-sm text-content-tertiary">
              No matches
            </p>
          ) : (
            items.map((item, i) => (
              <button
                aria-selected={i === highlighted}
                className={`flex w-full cursor-pointer items-center justify-between gap-3 rounded-sm px-3 py-2 text-left text-sm ${
                  i === highlighted
                    ? "bg-accent-muted text-content"
                    : "text-content-secondary hover:bg-surface-hover"
                }`}
                key={item.key}
                onClick={() => runItem(item)}
                onMouseEnter={() => setHighlighted(i)}
                // oxlint-disable-next-line jsx-a11y/prefer-tag-over-role
                role="option"
                type="button"
              >
                <span className="flex flex-col">
                  <span>{item.label}</span>
                  {item.description ? (
                    <span className="text-content-tertiary text-xs">
                      {item.description}
                    </span>
                  ) : null}
                </span>
                {item.shortcut ? (
                  <kbd className="shrink-0 rounded border border-border bg-surface-tertiary px-1.5 py-0.5 font-mono text-[10px] text-content-tertiary">
                    {item.shortcut}
                  </kbd>
                ) : null}
              </button>
            ))
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};
