import { logos } from "@/lib/marketing-copy";

export function LogosStrip() {
  return (
    <section className="border-b border-border px-6 py-10 sm:px-8">
      <div className="mx-auto flex max-w-3xl flex-col items-start gap-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="font-mono text-xs uppercase tracking-[0.2em] text-fg-faint">
          {logos.label}
        </p>
        <ul className="flex flex-wrap items-center gap-x-6 gap-y-2 font-mono text-sm text-fg-muted">
          {logos.items.map((item) => (
            <li key={item} className="whitespace-nowrap">
              {item}
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
