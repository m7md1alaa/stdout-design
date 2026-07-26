import Link from "next/link";

import { DitherGradient } from "@/components/dither-kit/gradient";
import { footer } from "@/lib/marketing-copy";

export function CtaFooter() {
  return (
    <footer className="relative overflow-hidden px-6 py-28 sm:px-8">
      <DitherGradient from="orange" direction="down" cell={4} />

      <div className="relative mx-auto flex max-w-3xl flex-col items-start">
        <h2 className="max-w-lg text-2xl font-medium leading-snug text-foreground sm:text-3xl">
          {footer.headline}
        </h2>
        <p className="mt-3 text-fg-muted">{footer.body}</p>

        <div className="mt-8 w-full max-w-md rounded-sm border border-border bg-card/80 px-4 py-3 font-mono text-sm text-fg-muted">
          <span className="select-none text-fg-faint)">$ </span>
          {footer.installCommand}
        </div>

        <nav className="mt-14 flex flex-wrap gap-x-8 gap-y-2 border-t border-border pt-8 font-mono text-sm text-fg-faint">
          {footer.links.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="transition-colors hover:text-foreground"
            >
              {link.label}
            </Link>
          ))}
        </nav>
      </div>
    </footer>
  );
}
