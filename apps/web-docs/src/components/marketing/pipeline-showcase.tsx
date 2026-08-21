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
    <section className="border-border overflow-hidden border-b px-6 py-20 sm:px-8">
      <div className="mx-auto max-w-5xl">
        {/* Screen-reader label for the diagram */}
        <p className="sr-only">
          Pipeline diagram: Your TSX component flows through the CLI renderer
          and outputs to multiple targets.
        </p>

        <div
          className="flex flex-col items-center justify-center gap-0 sm:flex-row"
          aria-hidden="true"
        >
          {/* ── Node 1: TSX Component ── */}
          <div className="terminal-container flex w-full flex-col gap-2 rounded-xl bg-black/60 p-5 sm:w-52">
            <p className="text-fg-faint font-mono text-[9px] tracking-[0.2em] uppercase">
              input
            </p>
            <p className="text-foreground font-mono text-sm font-medium">
              BentoFeature.tsx
            </p>
            <p className="text-fg-muted font-mono text-[11px] leading-relaxed">
              Typed props,
              <br />
              React component
            </p>
            <div className="mt-2 flex items-center gap-1.5">
              <span className="bg-accent/70 size-1.5 rounded-full" />
              <span className="text-fg-faint font-mono text-[9px]">
                your codebase
              </span>
            </div>
          </div>

          {/* ── Connector: input → CLI ── */}
          <div className="relative flex items-center justify-center">
            {/* Horizontal line on sm+, vertical line on mobile */}
            <div className="relative hidden h-px w-16 overflow-hidden sm:block">
              <div className="pulse-shimmer h-full" />
            </div>
            <div className="relative h-8 w-px overflow-hidden sm:hidden">
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
          <div className="terminal-container ring-accent/20 flex w-full flex-col gap-2 rounded-xl bg-black/80 p-5 ring-1 sm:w-56">
            <p className="text-accent font-mono text-[9px] tracking-[0.2em] uppercase">
              render core
            </p>
            <p className="text-accent font-mono text-base font-medium">
              studio render
            </p>
            <p className="text-fg-muted font-mono text-[11px] leading-relaxed">
              CLI · Studio · MCP
              <br />
              one render path
            </p>
            <div className="mt-2 flex items-center gap-1.5">
              <span className="bg-accent size-1.5 animate-pulse rounded-full" />
              <span className="text-accent/70 font-mono text-[9px]">
                running
              </span>
            </div>
          </div>

          {/* ── Connector: CLI → outputs ── */}
          <div className="relative flex items-center justify-center">
            <div className="relative hidden h-px w-16 overflow-hidden sm:block">
              <div
                className="pulse-shimmer h-full"
                style={{ animationDelay: "0.5s" }}
              />
            </div>
            <div className="relative h-8 w-px overflow-hidden sm:hidden">
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
          <div className="terminal-container flex w-full flex-col gap-2 rounded-xl bg-black/60 p-5 sm:w-52">
            <p className="text-fg-faint font-mono text-[9px] tracking-[0.2em] uppercase">
              output
            </p>
            <p className="text-foreground font-mono text-sm font-medium">
              production assets
            </p>
            <ul className="mt-1 flex flex-col gap-1">
              {outputTargets.map((target) => (
                <li key={target} className="flex items-center gap-1.5">
                  <span className="bg-fg-faint/50 size-1 shrink-0 rounded-full" />
                  <span className="text-fg-muted font-mono text-[11px]">
                    {target}
                  </span>
                </li>
              ))}
              <li className="flex items-center gap-1.5">
                <span className="bg-fg-faint/50 size-1 shrink-0 rounded-full" />
                <span className="text-fg-faint font-mono text-[11px]">
                  + more
                </span>
              </li>
            </ul>
          </div>
        </div>

        {/* Sub-label */}
        <p className="text-fg-faint mt-10 text-center font-mono text-xs tracking-[0.2em] uppercase">
          one command · no drift · local-first
        </p>
      </div>
    </section>
  );
}
