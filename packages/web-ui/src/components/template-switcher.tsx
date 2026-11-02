import { CheckIcon, ChevronsUpDownIcon } from "lucide-react";
import { useRef, useState } from "react";
import type * as React from "react";

import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { cn } from "@/lib/utils";

interface TemplateOption {
  id: string;
  description: string;
}

interface TemplateSwitcherProps {
  templates: TemplateOption[];
  selected: string | null;
  onChange: (id: string) => void;
}

const FOCUS_TARGET_BY_KEY: Record<string, "next" | "prev" | "first" | "last"> =
  {
    ArrowDown: "next",
    ArrowUp: "prev",
    End: "last",
    Home: "first",
  };

/** Up, Down, Home and End move focus between the template buttons, like a menu. */
const handleListKeyDown = (event: React.KeyboardEvent<HTMLElement>) => {
  const target = FOCUS_TARGET_BY_KEY[event.key];
  if (!target) {
    return;
  }
  event.preventDefault();
  const buttons = [...event.currentTarget.querySelectorAll("button")];
  const current = buttons.indexOf(document.activeElement as HTMLButtonElement);
  const last = buttons.length - 1;
  const indexByTarget = {
    first: 0,
    last,
    next: current >= last ? 0 : current + 1,
    prev: current <= 0 ? last : current - 1,
  };
  buttons[indexByTarget[target]]?.focus();
};

/** Toolbar control that lists every template with its description. */
export const TemplateSwitcher = ({
  templates,
  selected,
  onChange,
}: TemplateSwitcherProps) => {
  const [open, setOpen] = useState(false);
  const selectedRef = useRef<HTMLButtonElement>(null);

  if (templates.length === 0) {
    return (
      <span className="text-muted-foreground px-2 text-sm">
        No templates found
      </span>
    );
  }

  return (
    <Popover onOpenChange={setOpen} open={open}>
      <PopoverTrigger
        render={
          <Button
            aria-label="Switch template"
            className="max-w-56 min-w-0 shrink justify-between gap-2"
            id="template-select"
            size="sm"
            variant="ghost"
          />
        }
      >
        <span className="truncate font-medium">{selected ?? "Template"}</span>
        <ChevronsUpDownIcon className="size-3.5 opacity-60" />
      </PopoverTrigger>
      <PopoverContent
        align="start"
        className="w-80 gap-0 rounded-lg p-1"
        initialFocus={selectedRef}
        onKeyDown={handleListKeyDown}
        sideOffset={6}
      >
        <ul className="m-0 flex max-h-96 list-none flex-col overflow-y-auto p-0">
          {templates.map((template) => {
            const isSelected = template.id === selected;
            return (
              <li key={template.id}>
                <button
                  aria-current={isSelected ? "true" : undefined}
                  className={cn(
                    "hover:bg-accent focus-visible:bg-accent grid w-full cursor-default grid-cols-[1fr_1rem] items-start gap-2 rounded-md px-2 py-1.5 text-left outline-none"
                  )}
                  onClick={() => {
                    onChange(template.id);
                    setOpen(false);
                  }}
                  ref={isSelected ? selectedRef : undefined}
                  type="button"
                >
                  <span className="min-w-0">
                    <span className="block truncate text-sm font-medium">
                      {template.id}
                    </span>
                    {template.description ? (
                      <span className="text-muted-foreground line-clamp-2 block text-xs">
                        {template.description}
                      </span>
                    ) : null}
                  </span>
                  {isSelected ? (
                    <CheckIcon aria-hidden="true" className="mt-0.5 size-4" />
                  ) : null}
                </button>
              </li>
            );
          })}
        </ul>
      </PopoverContent>
    </Popover>
  );
};
