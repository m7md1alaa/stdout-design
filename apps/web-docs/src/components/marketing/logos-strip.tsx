import { logos } from "@/lib/marketing-copy";

export function LogosStrip() {
  return (
    <section className="border-border border-b px-6 py-10 sm:px-8">
      <div className="mx-auto flex max-w-3xl flex-col items-start gap-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-fg-faint font-mono text-xs tracking-[0.2em] uppercase">
          {logos.label}
        </p>
        <ul className="text-fg-muted flex flex-wrap items-center gap-x-6 gap-y-2 font-mono text-sm">
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
