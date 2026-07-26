import { parity } from "@/lib/marketing-copy";

export function InterfaceParity() {
  return (
    <section className="border-b border-border px-6 py-24 sm:px-8">
      <div className="mx-auto max-w-3xl">
        <p className="mb-4 font-mono text-xs uppercase tracking-[0.2em] text-fg-faint">
          {parity.eyebrow}
        </p>
        <h2 className="mb-12 max-w-xl text-2xl font-medium leading-snug text-foreground sm:text-3xl">
          {parity.headline}
        </h2>

        <div className="overflow-x-auto rounded-sm border border-border">
          <table className="w-full min-w-140 border-collapse font-mono text-sm">
            <thead>
              <tr className="border-b border-border text-left text-xs uppercase tracking-[0.15em] text-fg-faint">
                <th className="px-4 py-3 font-normal">Capability</th>
                <th className="px-4 py-3 font-normal">studio dev</th>
                <th className="px-4 py-3 font-normal">CLI</th>
              </tr>
            </thead>
            <tbody>
              {parity.rows.map((row, i) => (
                <tr
                  key={row.capability}
                  className={
                    i !== parity.rows.length - 1 ? "border-b border-border" : ""
                  }
                >
                  <td className="px-4 py-3 text-foreground">
                    {row.capability}
                  </td>
                  <td className="px-4 py-3 text-fg-muted">{row.ui}</td>
                  <td className="px-4 py-3 text-fg-muted">{row.cli}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  );
}
