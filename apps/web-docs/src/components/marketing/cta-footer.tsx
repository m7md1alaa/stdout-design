import Link from "next/link";

import { DitherGradient } from "@/components/dither-kit/gradient";
import { InstallCommand } from "@/components/install-command";
import { footer } from "@/lib/marketing-copy";
import { ACCENT_HUE } from "@/lib/theme";

export function CtaFooter() {
  return (
    <footer className="relative overflow-hidden px-6 py-28 sm:px-8">
      <DitherGradient
        from={ACCENT_HUE}
        direction="down"
        cell={4}
        opacity={0.6}
      />
      {/* Legibility overlay */}
      <div className="from-background/80 via-background/40 pointer-events-none absolute inset-0 bg-gradient-to-b to-transparent" />

      <div className="relative mx-auto flex max-w-3xl flex-col items-start">
        {/* Heading with glow */}
        <div className="relative mb-3">
          <h2 className="text-foreground max-w-lg text-2xl leading-snug font-medium sm:text-3xl">
            {footer.headline}
          </h2>
          <div
            aria-hidden="true"
            className="title-glow max-w-lg text-2xl leading-snug font-medium sm:text-3xl"
          >
            {footer.headline}
          </div>
        </div>

        <p className="text-fg-muted mt-3">{footer.body}</p>

        <div className="mt-8">
          <InstallCommand />
        </div>

        <nav className="border-border mt-14 flex flex-wrap gap-x-8 gap-y-2 border-t pt-8 font-mono text-sm">
          {footer.links.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="transition-colors hover:underline"
            >
              {link.label}
            </Link>
          ))}
        </nav>

        <p className="mt-4 font-mono text-sm hover:underline">
          by{" "}
          <Link
            href="https://mohdalaa.com"
            target="_blank"
            rel="noopener noreferrer"
            className="transition-colors"
          >
            mohd
          </Link>
        </p>
      </div>
    </footer>
  );
}
