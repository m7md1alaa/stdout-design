import { features } from "@/lib/marketing-copy";

export function FeaturesGrid() {
  return (
    <section className="border-b border-border px-6 py-24 sm:px-8">
      <div className="mx-auto max-w-5xl">
        <p className="mb-4 font-mono text-xs uppercase tracking-[0.2em] text-fg-faint">
          {features.eyebrow}
        </p>
        <h2 className="mb-12 max-w-2xl text-2xl font-medium leading-snug text-foreground sm:text-3xl">
          {features.headline}
        </h2>

        <div className="grid grid-cols-1 gap-px overflow-hidden rounded-lg border border-border bg-border sm:grid-cols-2">
          {features.items.map((feature) => (
            <article key={feature.label} className="bg-background p-6 sm:p-7">
              <p className="mb-3 font-mono text-xs uppercase tracking-[0.2em] text-accent">
                {feature.label}
              </p>
              <h3 className="mb-2 font-mono text-base font-medium text-foreground">
                {feature.title}
              </h3>
              <p className="leading-relaxed text-fg-muted">{feature.body}</p>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
