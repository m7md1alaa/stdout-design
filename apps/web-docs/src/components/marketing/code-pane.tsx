"use client";

import { Check, Clipboard } from "lucide-react";
import { useState } from "react";

import { Code } from "@/lib/highlight";

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);

  async function handleCopy() {
    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <button
      type="button"
      onClick={handleCopy}
      className="relative flex cursor-pointer items-center justify-center rounded-lg p-1.5 text-fg-muted transition-colors hover:text-foreground focus:outline-hidden"
      aria-label="Copy to clipboard"
    >
      <Clipboard
        className="absolute size-4 transition-all duration-200 ease-out"
        style={{
          opacity: copied ? 0 : 1,
          transform: copied ? "scale(0.75)" : "scale(1)",
        }}
      />
      <Check
        className="absolute size-4 transition-all duration-200"
        style={{
          opacity: copied ? 1 : 0,
          transform: copied ? "scale(1)" : "scale(0.75)",
          transitionTimingFunction: copied
            ? "cubic-bezier(0.34, 1.56, 0.64, 1)"
            : "cubic-bezier(0.23, 1, 0.32, 1)",
        }}
      />
      <span className="sr-only" aria-live="polite">
        {copied ? "Copied" : "Copy to clipboard"}
      </span>
    </button>
  );
}

export function CodePane({
  label,
  file,
  code,
}: {
  label: string;
  file: string;
  code: string;
}) {
  return (
    <figure className="overflow-hidden rounded-xl border border-border bg-black/80">
      <figcaption className="flex items-center justify-between border-b border-border/60 px-4 py-2.5">
        <span className="flex min-w-0 items-center gap-2 font-mono text-xs text-fg-muted">
          <span
            aria-hidden="true"
            className="size-1.5 shrink-0 rounded-full bg-accent"
          />
          <span className="truncate">
            {label} — {file}
          </span>
        </span>
        <CopyButton text={code} />
      </figcaption>
      <div className="overflow-x-auto p-4">
        <Code code={code} />
      </div>
    </figure>
  );
}
