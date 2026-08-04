import { logos } from "@/lib/marketing-copy";

/**
 * PipelineShowcase
 * A purely visual section showing the TSX → CLI → Assets pipeline
 * using terminal-container borders and pulse-shimmer connector lines.
 * Lives between LogosStrip and FeaturesGrid in page.tsx.
 */
export function PipelineShowcase() {
  const outputTargets = logos.items.slice(0, 4); // App Store, Google Play, Open Graph, X cards

  return (
    <section className="border-b border-border px-6 py-20 sm:px-8 overflow-hidden">
      <div className="mx-auto max-w-5xl">

        {/* Screen-reader label for the diagram */}
        <p className="sr-only">
          Pipeline diagram: Your TSX component flows through the CLI renderer and outputs to multiple targets.
        </p>

        <div
          className="flex flex-col sm:flex-row items-center justify-center gap-0"
          aria-hidden="true"
        >

          {/* ── Node 1: TSX Component ── */}
          <div className="terminal-container rounded-xl bg-black/60 p-5 w-full sm:w-52 flex flex-col gap-2">
            <p className="font-mono text-[9px] uppercase tracking-[0.2em] text-fg-faint">
              input
            </p>
            <p className="font-mono text-sm font-medium text-foreground">
              BentoFeature.tsx
            </p>
            <p className="font-mono text-[11px] text-fg-muted leading-relaxed">
              Typed props,<br />
              React component
            </p>
            <div className="mt-2 flex items-center gap-1.5">
              <span className="size-1.5 rounded-full bg-accent/70" />
              <span className="font-mono text-[9px] text-fg-faint">your codebase</span>
            </div>
          </div>

          {/* ── Connector: input → CLI ── */}
          <div className="relative flex items-center justify-center">
            {/* Horizontal line on sm+, vertical line on mobile */}
            <div className="hidden sm:block relative h-px w-16 overflow-hidden">
              <div className="pulse-shimmer h-full" />
            </div>
            <div className="sm:hidden relative w-px h-8 overflow-hidden">
              <div
                className="absolute inset-x-0 w-full"
                style={{
                  height: "35%",
                  background:
                    "linear-gradient(180deg, transparent 0%, color-mix(in srgb, var(--accent) 55%, transparent) 50%, transparent 100%)",
                  animation: "pulse-right 2s linear infinite",
                }}
              />
            </div>
          </div>

          {/* ── Node 2: CLI / studio render ── */}
          <div className="terminal-container rounded-xl bg-black/80 p-5 w-full sm:w-56 flex flex-col gap-2 ring-1 ring-accent/20">
            <p className="font-mono text-[9px] uppercase tracking-[0.2em] text-accent">
              render core
            </p>
            <p className="font-mono text-base font-medium text-accent">
              studio render
            </p>
            <p className="font-mono text-[11px] text-fg-muted leading-relaxed">
              CLI · Studio · MCP<br />
              one render path
            </p>
            <div className="mt-2 flex items-center gap-1.5">
              <span className="size-1.5 rounded-full bg-accent animate-pulse" />
              <span className="font-mono text-[9px] text-accent/70">running</span>
            </div>
          </div>

          {/* ── Connector: CLI → outputs ── */}
          <div className="relative flex items-center justify-center">
            <div className="hidden sm:block relative h-px w-16 overflow-hidden">
              <div className="pulse-shimmer h-full" style={{ animationDelay: "0.5s" }} />
            </div>
            <div className="sm:hidden relative w-px h-8 overflow-hidden">
              <div
                className="absolute inset-x-0 w-full"
                style={{
                  height: "35%",
                  background:
                    "linear-gradient(180deg, transparent 0%, color-mix(in srgb, var(--accent) 55%, transparent) 50%, transparent 100%)",
                  animation: "pulse-right 2s linear infinite",
                  animationDelay: "0.5s",
                }}
              />
            </div>
          </div>

          {/* ── Node 3: Output targets ── */}
          <div className="terminal-container rounded-xl bg-black/60 p-5 w-full sm:w-52 flex flex-col gap-2">
            <p className="font-mono text-[9px] uppercase tracking-[0.2em] text-fg-faint">
              output
            </p>
            <p className="font-mono text-sm font-medium text-foreground">
              production assets
            </p>
            <ul className="mt-1 flex flex-col gap-1">
              {outputTargets.map((target) => (
                <li key={target} className="flex items-center gap-1.5">
                  <span className="size-1 rounded-full bg-fg-faint/50 shrink-0" />
                  <span className="font-mono text-[11px] text-fg-muted">
                    {target}
                  </span>
                </li>
              ))}
              <li className="flex items-center gap-1.5">
                <span className="size-1 rounded-full bg-fg-faint/50 shrink-0" />
                <span className="font-mono text-[11px] text-fg-faint">
                  + more
                </span>
              </li>
            </ul>
          </div>

        </div>

        {/* Sub-label */}
        <p className="mt-10 text-center font-mono text-xs text-fg-faint uppercase tracking-[0.2em]">
          one command · no drift · local-first
        </p>

      </div>
    </section>
  );
}
