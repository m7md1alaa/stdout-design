"use client";

import { useRef, useState } from "react";

import { CodePane } from "@/components/marketing/code-pane";
import { showcase } from "@/lib/marketing-copy";

const tabs = showcase.tabs;

export function InterfaceShowcase() {
  const [activeIndex, setActiveIndex] = useState(0);
  const tabsRef = useRef<Array<HTMLButtonElement | null>>([]);

  function onKeyDown(e: React.KeyboardEvent) {
    if (e.key !== "ArrowRight" && e.key !== "ArrowLeft") return;
    e.preventDefault();
    const next =
      e.key === "ArrowRight"
        ? (activeIndex + 1) % tabs.length
        : (activeIndex - 1 + tabs.length) % tabs.length;
    setActiveIndex(next);
    tabsRef.current[next]?.focus();
  }

  return (
    <section className="border-b border-border px-6 py-24 sm:px-8">
      <div className="mx-auto max-w-3xl">
        <p className="mb-4 font-mono text-xs uppercase tracking-[0.2em] text-fg-faint">
          {showcase.eyebrow}
        </p>
        <h2 className="mb-3 max-w-xl text-2xl font-medium leading-snug text-foreground sm:text-3xl">
          {showcase.headline}
        </h2>
        <p className="mb-8 max-w-xl leading-relaxed text-fg-muted">
          {showcase.body}
        </p>

        <div
          role="tablist"
          aria-label={showcase.ariaLabel}
          onKeyDown={onKeyDown}
          className="flex gap-1 border-b border-border"
        >
          {tabs.map((tab, i) => (
            <button
              key={tab.id}
              ref={(el) => {
                tabsRef.current[i] = el;
              }}
              role="tab"
              id={`interface-tab-${tab.id}`}
              aria-selected={activeIndex === i}
              aria-controls={`interface-panel-${tab.id}`}
              tabIndex={activeIndex === i ? 0 : -1}
              onClick={() => setActiveIndex(i)}
              className={`-mb-px border-b-2 px-4 py-2.5 font-mono text-sm transition-colors ${
                activeIndex === i
                  ? "border-accent text-foreground"
                  : "border-transparent text-fg-muted hover:text-foreground"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {tabs.map((tab, i) => (
          <div
            key={tab.id}
            role="tabpanel"
            id={`interface-panel-${tab.id}`}
            aria-labelledby={`interface-tab-${tab.id}`}
            hidden={activeIndex !== i}
            className="pt-4"
          >
            <CodePane label={tab.label} file={tab.file} code={tab.code} />
          </div>
        ))}
      </div>
    </section>
  );
}
