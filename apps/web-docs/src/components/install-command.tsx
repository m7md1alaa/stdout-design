"use client";

import { Clipboard, Check } from "lucide-react";
import { useState } from "react";

interface InstallCommandProps {
  command?: string;
}

export function InstallCommand({
  command = "npx @stdout-design/cli init",
}: InstallCommandProps) {
  const [copied, setCopied] = useState(false);

  async function handleCopy() {
    await navigator.clipboard.writeText(command);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <pre className="border-border relative inline-flex h-11 w-full max-w-max items-center overflow-auto rounded-xl border bg-black/80 pr-11 pl-4 font-mono text-sm whitespace-pre">
      {/* Top edge — animated shimmer */}
      <div className="absolute inset-x-0 top-0 h-px overflow-hidden">
        <div className="pulse-shimmer h-full" />
      </div>

      {/* Bottom edge — animated shimmer, delayed */}
      <div className="absolute inset-x-0 bottom-0 h-px overflow-hidden">
        <div
          className="pulse-shimmer h-full"
          style={{ animationDelay: "1s" }}
        />
      </div>

      <div
        className="whitespace-pre"
        style={{ color: "#EDEDEF", fontSize: 13, lineHeight: "130%" }}
      >
        {command}
      </div>

      <button
        type="button"
        onClick={handleCopy}
        className="absolute right-1 flex cursor-pointer items-center justify-center rounded-xl p-2.5 text-[#EEF7FE] transition-all duration-200 ease-out hover:text-white focus:outline-hidden active:scale-95"
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
    </pre>
  );
}
