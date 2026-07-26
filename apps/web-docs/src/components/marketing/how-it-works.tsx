import { steps } from "@/lib/marketing-copy";

export function HowItWorks() {
  return (
    <section className="border-b border-border px-6 py-24 sm:px-8">
      <div className="mx-auto max-w-3xl">
        <p className="mb-4 font-mono text-xs uppercase tracking-[0.2em] text-fg-faint">
          {steps.eyebrow}
        </p>
        <h2 className="mb-14 max-w-xl text-2xl font-medium leading-snug text-foreground sm:text-3xl">
          {steps.headline}
        </h2>

        <ol className="space-y-10">
          {steps.items.map((step) => (
            <li key={step.index} className="flex gap-6">
              <span className="font-mono text-sm text-accent">
                {step.index}
              </span>
              <div>
                <h3 className="mb-1.5 font-mono text-base text-foreground">
                  {step.title}
                </h3>
                <p className="max-w-lg leading-relaxed text-fg-muted">
                  {step.body}
                </p>
              </div>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}
