"use client";

import { useEffect, useRef, useState } from "react";

type LogLine = {
  text: string;
  type: "cmd" | "success" | "info" | "error" | "muted";
  isLatest?: boolean;
};

// Real commands and real output file names from the scaffolded starter,
// so the hero never promises a file the CLI doesn't write.
const SEQUENCE: LogLine[] = [
  { text: "$ npx @stdout-design/cli init --yes", type: "cmd" },
  { text: "✔ 4 templates, 2 locales, fonts wired", type: "success" },
  { text: "", type: "muted" },
  { text: "$ studio render launch-hero \\", type: "cmd" },
  { text: "    --preset all --locale en,ar", type: "muted" },
  { text: "", type: "muted" },
  { text: "  Resolving template…", type: "info" },
  { text: "  Fetching fonts: Archivo Black, Lalezar…", type: "info" },
  {
    text: "  Rendering 1/4 → launch-hero.en.instagram-square.png",
    type: "info",
  },
  { text: "  Rendering 2/4 → launch-hero.en.x-card.png", type: "info" },
  {
    text: "  Rendering 3/4 → launch-hero.ar.instagram-square.png",
    type: "info",
  },
  { text: "  Rendering 4/4 → launch-hero.ar.x-card.png", type: "info" },
  { text: "", type: "muted" },
  { text: "✔ Rendered 4 assets, 2 of them right-to-left", type: "success" },
  { text: "", type: "muted" },
  { text: "$ studio render trend-poster --locale ar", type: "cmd" },
  { text: "✔ trend-poster.ar.instagram-square.png", type: "success" },
];

const COLOR: Record<LogLine["type"], string> = {
  cmd: "text-accent",
  success: "text-emerald-400",
  info: "text-muted-foreground",
  error: "text-red-400",
  muted: "text-muted-foreground/50",
};

const TICK_MS = 80; // ms per line reveal
const PAUSE_MS = 2200; // pause at end before reset

export function TerminalPane() {
  const [visibleCount, setVisibleCount] = useState(0);
  const [isRunning] = useState(true);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isRunning) return;

    if (visibleCount < SEQUENCE.length) {
      const timer = setTimeout(() => {
        setVisibleCount((c) => c + 1);
      }, TICK_MS);
      return () => clearTimeout(timer);
    }

    // All lines shown — pause then reset
    const reset = setTimeout(() => {
      setVisibleCount(0);
    }, PAUSE_MS);
    return () => clearTimeout(reset);
  }, [visibleCount, isRunning]);

  // Auto-scroll to bottom as lines appear
  useEffect(() => {
    if (containerRef.current) {
      containerRef.current.scrollTop = containerRef.current.scrollHeight;
    }
  }, [visibleCount]);

  const visibleLines = SEQUENCE.slice(0, visibleCount);
  const isComplete = visibleCount >= SEQUENCE.length;

  return (
    <figure className="terminal-container overflow-hidden rounded-xl bg-black/85 shadow-2xl shadow-black/60">
      {/* Window chrome */}
      <figcaption className="border-border/60 flex items-center justify-between border-b px-4 py-2.5">
        <div className="flex items-center gap-1.5">
          {/* macOS-style dots */}
          <span className="bg-muted/50 size-2.5 rounded-full border border-white/10" />
          <span className="bg-muted/50 size-2.5 rounded-full border border-white/10" />
          <span className="bg-muted/50 size-2.5 rounded-full border border-white/10" />
        </div>

        <span className="text-muted-foreground/60 font-mono text-[10px] tracking-wider uppercase">
          studio render
        </span>

        {/* Live indicator dot */}
        <div className="flex items-center gap-1.5">
          <span
            className={`relative flex size-1.5 ${isComplete ? "opacity-40" : ""}`}
          >
            {!isComplete && (
              <span className="bg-accent absolute inline-flex size-full animate-ping rounded-full opacity-40" />
            )}
            <span
              className={`relative inline-flex size-1.5 rounded-full transition-colors duration-500 ${
                isComplete ? "bg-muted-foreground/30" : "bg-accent"
              }`}
            />
          </span>
          <span className="text-muted-foreground/60 hidden font-mono text-[9px] tracking-wider uppercase sm:inline">
            {isComplete ? "done" : "live"}
          </span>
        </div>
      </figcaption>

      {/* Terminal body */}
      <div className="relative h-[300px] sm:h-[340px]">
        {/* Top + bottom fade masks */}
        <div className="pointer-events-none absolute inset-x-0 top-0 z-10 h-5 bg-gradient-to-b from-black/85 to-transparent" />
        <div className="pointer-events-none absolute inset-x-0 bottom-0 z-10 h-8 bg-gradient-to-t from-black/85 to-transparent" />

        {/* Dot-grid texture */}
        <div className="terminal-dots pointer-events-none absolute inset-0" />

        {/* Scrollable content */}
        <div
          ref={containerRef}
          className="absolute inset-0 overflow-hidden px-4 py-4 font-mono text-[12px] leading-relaxed"
        >
          {visibleLines.map((line, i) => {
            const isLast = i === visibleLines.length - 1;
            return (
              <div
                key={i}
                className={`py-[1px] ${isLast && !isComplete ? "terminal-latest-line" : ""}`}
              >
                <span className={COLOR[line.type]}>{line.text}</span>
              </div>
            );
          })}

          {/* Blinking cursor on last line */}
          {!isComplete && (
            <div className="py-[1px]">
              <span className="caret text-accent text-sm">▍</span>
            </div>
          )}
        </div>
      </div>

      {/* Footer strip */}
      <div className="border-border/30 flex items-center justify-between border-t px-4 py-2">
        <span className="text-muted-foreground/40 font-mono text-[10px]">
          stdout-design
        </span>
        <span className="text-accent/60 font-mono text-[10px]">
          TSX → pixels
        </span>
      </div>
    </figure>
  );
}
