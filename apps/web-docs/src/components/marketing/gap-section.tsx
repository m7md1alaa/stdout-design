import { gap } from "@/lib/marketing-copy";

function Pane({
  label,
  lines,
  muted,
}: {
  label: string;
  lines: string[];
  muted?: boolean;
}) {
  return (
    <div
      className={`rounded-sm border px-5 py-5 font-mono text-sm leading-relaxed ${
        muted
          ? "border-border text-fg-faint"
          : "border-accent-dim text-foreground"
      }`}
    >
      <p
        className={`mb-4 text-xs uppercase tracking-[0.2em] ${
          muted ? "text-fg-faint" : "text-accent"
        }`}
      >
        {label}
      </p>
      <div className="space-y-1.5">
        {lines.map((line) => (
          <p key={line} className="whitespace-pre">
            {line}
          </p>
        ))}
      </div>
    </div>
  );
}

export function GapSection() {
  return (
    <section className="border-b border-border px-6 py-24 sm:px-8">
      <div className="mx-auto max-w-3xl">
        <p className="mb-4 font-mono text-xs uppercase tracking-[0.2em] text-fg-faint">
          {gap.eyebrow}
        </p>
        <h2 className="mb-12 max-w-xl text-2xl font-medium leading-snug text-foreground sm:text-3xl">
          {gap.headline}
        </h2>

        <div className="grid gap-4 sm:grid-cols-2">
          <Pane label={gap.oldWay.label} lines={gap.oldWay.lines} muted />
          <Pane label={gap.newWay.label} lines={gap.newWay.lines} />
        </div>
      </div>
    </section>
  );
}
