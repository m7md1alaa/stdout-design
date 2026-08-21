"use client";

import { Check, Clipboard } from "lucide-react";
import { useEffect, useState } from "react";

export interface InstallAudience {
  id: string;
  label: string;
  command: string;
  /** If set, this is copied to the clipboard instead of `command` — a
   * natural-language instruction meant to be pasted into an agent chat
   * rather than run in a shell. The chip still displays `command`. */
  prompt?: string;
}

interface InstallToggleProps {
  audiences: InstallAudience[];
}

const COMMAND_EASE = "cubic-bezier(0.23, 1, 0.32, 1)";
const FADE_MS = 200; // text fade-out/in duration
const TEXT_WRAPPER_MS = 260; // width transition duration

export function InstallToggle({ audiences }: InstallToggleProps) {
  const [activeId, setActiveId] = useState(audiences[0]?.id ?? "");
  const [copied, setCopied] = useState(false);
  // Text content lags the width by one fade-out so the swap happens while hidden.
  const [command, setCommand] = useState(audiences[0]?.command ?? "");
  const [commandVisible, setCommandVisible] = useState(true);

  const active = audiences.find((a) => a.id === activeId) ?? audiences[0];

  useEffect(() => {
    if (commandVisible || !active) return;
    const timer = setTimeout(() => {
      setCommand(active.command);
      setCommandVisible(true);
    }, FADE_MS);
    return () => clearTimeout(timer);
  }, [commandVisible, active]);

  function handleSelect(id: string) {
    if (id === activeId) return;
    setCommandVisible(false);
    setActiveId(id);
  }

  async function handleCopy() {
    if (!active) return;
    await navigator.clipboard.writeText(active.prompt ?? active.command);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  if (!active) return null;

  return (
    <div className="flex flex-col items-start">
      <div className="mb-2 flex items-center gap-3 font-mono text-[10px] tracking-widest uppercase">
        {audiences.map((audience, i) => (
          <span key={audience.id} className="flex items-center gap-3">
            {i > 0 && (
              <span className="bg-accent h-3 w-px" aria-hidden="true" />
            )}
            <button
              type="button"
              aria-pressed={audience.id === activeId}
              onClick={() => handleSelect(audience.id)}
              className={`cursor-pointer transition-colors duration-150 ${
                audience.id === activeId
                  ? "text-foreground"
                  : "text-fg-muted hover:text-foreground"
              }`}
            >
              {audience.label}
            </button>
          </span>
        ))}
      </div>

      <button
        type="button"
        onClick={handleCopy}
        className="group border-border hover:border-primary/50 flex cursor-copy items-center gap-2 rounded-full border bg-black/60 px-4 py-1.5 shadow-sm shadow-black/30 backdrop-blur-sm transition-[border-color,transform] duration-200 ease-[cubic-bezier(0.23,1,0.32,1)] active:scale-[0.98]"
        aria-label={
          active.prompt ? "Copy agent setup prompt" : `Copy ${active.command}`
        }
      >
        <span
          className="text-accent font-mono text-xs select-none"
          aria-hidden="true"
        >
          $
        </span>
        <span
          className="text-foreground relative inline-block h-4 overflow-hidden font-mono text-xs transition-[width]"
          style={{
            width: `${active.command.length}ch`,
            transitionTimingFunction: COMMAND_EASE,
            transitionDuration: `${TEXT_WRAPPER_MS}ms`,
          }}
        >
          <span
            className="absolute inset-0 text-left whitespace-pre transition-[opacity,filter]"
            style={{
              opacity: commandVisible ? 1 : 0,
              filter: commandVisible ? "blur(0px)" : "blur(3px)",
              transitionTimingFunction: COMMAND_EASE,
              transitionDuration: `${FADE_MS}ms`,
            }}
          >
            {command}
          </span>
        </span>
        <span className="relative size-3.5 shrink-0" aria-hidden="true">
          <Clipboard
            className="text-fg-muted group-hover:text-foreground absolute inset-0 size-3.5 opacity-100 transition-[opacity,transform] duration-150"
            style={{
              opacity: copied ? 0 : 1,
              transform: copied ? "scale(0.75)" : "scale(1)",
            }}
          />
          <Check
            className="absolute inset-0 size-3.5 text-emerald-400 transition-[opacity,transform] duration-150"
            style={{
              opacity: copied ? 1 : 0,
              transform: copied ? "scale(1)" : "scale(0.75)",
            }}
          />
        </span>
        <span className="sr-only" aria-live="polite">
          {copied
            ? "Copied"
            : active.prompt
              ? "Copy agent setup prompt"
              : "Copy to clipboard"}
        </span>
      </button>
    </div>
  );
}
