import Link from "next/link";

import { DitherGradient } from "@/components/dither-kit/gradient";
import { InstallCommand } from "@/components/install-command";
import { hero } from "@/lib/marketing-copy";
import { ACCENT_HUE } from "@/lib/theme";

export function Hero() {
  return (
    <section className="relative overflow-hidden border-b border-border">
      <DitherGradient from={ACCENT_HUE} direction="up" />

      <div className="relative mx-auto flex max-w-3xl flex-col items-start px-6 pb-28 pt-32 sm:px-8">
        <p className="mb-6 font-mono text-xs uppercase tracking-[0.2em] text-accent">
          {hero.eyebrow}
        </p>

        <h1 className="font-mono text-4xl font-medium leading-[1.15] tracking-tight text-foreground sm:text-5xl">
          {hero.headline}
          <span aria-hidden="true" className="caret text-accent">
            _
          </span>
        </h1>

        <p className="mt-6 max-w-xl text-lg leading-relaxed text-fg-muted">
          {hero.subhead}
        </p>

        <div className="mt-10 flex flex-wrap items-center gap-4">
          <Link
            href={hero.primaryCta.href}
            className="inline-flex items-center rounded-sm bg-accent px-5 py-2.5 font-mono text-sm font-medium text-[#0b0b0a] transition-colors hover:bg-foreground"
          >
            {hero.primaryCta.label}
          </Link>
          <Link
            target="_blank"
            href={hero.secondaryCta.href}
            className="inline-flex items-center rounded-sm border border-border px-5 py-2.5 font-mono text-sm text-fg-muted transition-colors hover:border-fg-faint hover:text-foreground"
          >
            {hero.secondaryCta.label}
          </Link>
        </div>

        <div className="mt-14">
          <InstallCommand />
        </div>
      </div>
    </section>
  );
}
