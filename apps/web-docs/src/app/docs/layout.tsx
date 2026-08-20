import { DocsLayout } from "fumadocs-ui/layouts/docs";

import { DitherGradient } from "@/components/dither-kit/gradient";
import { baseOptions } from "@/lib/layout.shared";
import { source } from "@/lib/source";
import { ACCENT_HUE } from "@/lib/theme";

export default function Layout({ children }: LayoutProps<"/docs">) {
  return (
    <>
      {/* Ambient wash behind the whole docs surface — same dither texture
          as the hero, at a fraction of the opacity so it reads as
          atmosphere, not decoration, once you're reading. Fixed + a
          negative z-index keep it pinned to the viewport, painted once,
          never repainted as pages change underneath it. */}
      <div className="pointer-events-none fixed inset-0 -z-10">
        <DitherGradient
          from={ACCENT_HUE}
          direction="down"
          cell={6}
          opacity={0.07}
        />
      </div>
      <DocsLayout tree={source.getPageTree()} {...baseOptions()}>
        {children}
      </DocsLayout>
    </>
  );
}
