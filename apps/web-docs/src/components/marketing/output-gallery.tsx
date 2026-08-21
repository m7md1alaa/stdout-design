import Image from "next/image";

import { gallery } from "@/lib/marketing-copy";

const CARD_HEIGHT = 224; // px — every card shares this height; width follows its real aspect ratio

/**
 * OutputGallery
 * The literal proof behind "one template, every canvas": real PNGs that
 * came out of `studio render`, laid out at their true aspect ratios so
 * the crop differences (wide OG card next to a tall story) are visible
 * at a glance instead of asserted in copy.
 */
export function OutputGallery() {
  return (
    <section className="border-border relative overflow-hidden border-b px-6 py-24 sm:px-8">
      {/* Glow spot — this section's own signature: a single ambient light
          source behind the first render, standing in for the "one" in
          "one template, every canvas" instead of repeating the hero's
          text-glow trick. */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute top-1/2 left-1/2 h-[420px] w-[420px] -translate-x-[85%] -translate-y-1/2 rounded-full blur-3xl"
        style={{
          background:
            "radial-gradient(circle, color-mix(in srgb, var(--accent) 28%, transparent) 0%, transparent 70%)",
        }}
      />

      <div className="relative mx-auto max-w-5xl">
        <p className="text-accent mb-4 font-mono text-xs tracking-[0.2em] uppercase">
          {gallery.eyebrow}
        </p>
        <h2 className="text-foreground mb-3 max-w-xl text-2xl leading-snug font-medium sm:text-3xl">
          {gallery.headline}
        </h2>
        <p className="text-fg-muted mb-10 max-w-xl leading-relaxed">
          {gallery.body}
        </p>

        <div className="flex snap-x snap-mandatory gap-4 overflow-x-auto pb-2 sm:overflow-visible sm:pb-0">
          {gallery.items.map((item) => (
            <figure
              key={item.file}
              className="terminal-container shrink-0 snap-start overflow-hidden rounded-lg bg-black/60"
              style={{ height: CARD_HEIGHT, width: CARD_HEIGHT * item.ratio }}
            >
              <div
                className="relative w-full"
                style={{ height: CARD_HEIGHT - 28 }}
              >
                <Image
                  src={item.src}
                  alt={`${item.file} rendered from bento-feature.tsx`}
                  fill
                  sizes={`${Math.round(CARD_HEIGHT * item.ratio)}px`}
                  className="object-cover"
                />
              </div>
              <figcaption className="border-border/60 flex items-center justify-between border-t px-2.5 py-1.5">
                <span className="text-foreground/80 truncate font-mono text-[10px]">
                  {item.file}
                </span>
                <span className="text-fg-faint shrink-0 pl-2 font-mono text-[9px]">
                  {item.dims}
                </span>
              </figcaption>
            </figure>
          ))}
        </div>
      </div>
    </section>
  );
}
