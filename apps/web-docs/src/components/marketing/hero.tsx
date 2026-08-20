import Link from "next/link";

import { DitherGradient } from "@/components/dither-kit/gradient";
import { InstallToggle } from "@/components/install-toggle";
import { TerminalPane } from "@/components/marketing/terminal-pane";
import { hero } from "@/lib/marketing-copy";
import { ACCENT_HUE } from "@/lib/theme";

export function Hero() {
  return (
    <section className="relative overflow-hidden border-b border-border">
      <DitherGradient
        from={ACCENT_HUE}
        direction="up"
        cell={2}
        opacity={0.65}
      />
      {/* Legibility overlay — crushes dither brightness behind text */}
      <div className="absolute inset-0 bg-gradient-to-b from-background/80 via-background/40 to-transparent pointer-events-none" />

      <div className="relative mx-auto max-w-5xl px-6 sm:px-8 pb-20 pt-32">
        {/* Two-column layout on large screens */}
        <div className="flex flex-col lg:flex-row lg:items-start lg:gap-16">
          {/* ── Left column: headline + CTAs + install ── */}
          <div className="flex flex-col items-start lg:max-w-xl">
            <p className="mb-6 font-mono text-xs uppercase tracking-[0.2em] text-accent">
              {hero.eyebrow}
            </p>

            {/* Headline with glow effect */}
            <div className="relative mb-6">
              <h1 className="font-mono text-4xl font-medium leading-[1.15] tracking-tight text-foreground sm:text-5xl">
                {hero.headline}
                <span aria-hidden="true" className="caret text-accent">
                  _
                </span>
              </h1>
              {/* Ghost copy layered behind for the CRT phosphor glow */}
              <div
                aria-hidden="true"
                className="title-glow font-mono text-4xl font-medium leading-[1.15] tracking-tight sm:text-5xl"
              >
                {hero.headline}_
              </div>
            </div>

            <p className="max-w-xl text-lg leading-relaxed text-foreground mb-10">
              {hero.subhead}
            </p>

            <div className="flex flex-wrap items-center gap-4 mb-12">
              <Link
                href={hero.primaryCta.href}
                className="inline-flex items-center rounded-sm bg-white px-5 py-2.5 font-mono text-sm font-medium text-black transition-colors hover:bg-neutral-100"
              >
                {hero.primaryCta.label}
              </Link>
              <Link
                target="_blank"
                href={hero.secondaryCta.href}
                className="inline-flex items-center rounded-sm border border-border px-5 py-2.5 font-mono text-sm text-foreground transition-colors hover:underline hover:underline-offset-4"
              >
                {hero.secondaryCta.label}
              </Link>
            </div>

            <InstallToggle audiences={hero.audiences} />
          </div>

          {/* ── Right column: animated terminal pane ── */}
          <div className="mt-14 lg:mt-0 lg:flex-1 lg:min-w-0">
            <TerminalPane />
          </div>
        </div>
      </div>
    </section>
  );
}
