"use client";

import { Pause, Play } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import type { CSSProperties } from "react";
import { useState } from "react";

import { templateRail } from "@/lib/marketing-copy";

type TemplateId = keyof typeof templateRail.templates;
type Locale = (typeof templateRail.rows)[number]["locale"];

const PRESETS = {
  "instagram-square": { dims: "1080×1080", height: 1080, width: 1080 },
  "x-card": { dims: "1200×675", height: 675, width: 1200 },
} as const;

type PresetId = keyof typeof PRESETS;

// Card heights must match --card-h in global.css; they only feed `sizes`.
const CARD_HEIGHT_SM = 220;
const CARD_HEIGHT = 300;
// Slight, uneven tilts read as posters pinned to a wall, not a grid.
const TILTS = [-1.5, 1, -0.5, 1.5, -1, 0.5];

// Squares and wide cards alternate so neither row looks like a grid,
// and the Arabic row starts on different templates than the English one.
const ORDER: Record<Locale, [TemplateId, PresetId][]> = {
  ar: [
    ["trend-poster", "instagram-square"],
    ["retro-poster", "x-card"],
    ["bento-feature", "instagram-square"],
    ["launch-hero", "x-card"],
    ["trend-poster", "x-card"],
    ["retro-poster", "instagram-square"],
    ["bento-feature", "x-card"],
    ["launch-hero", "instagram-square"],
  ],
  en: [
    ["launch-hero", "instagram-square"],
    ["bento-feature", "x-card"],
    ["retro-poster", "instagram-square"],
    ["trend-poster", "x-card"],
    ["launch-hero", "x-card"],
    ["bento-feature", "instagram-square"],
    ["retro-poster", "x-card"],
    ["trend-poster", "instagram-square"],
  ],
};

const RailCard = ({
  index,
  locale,
  preset,
  template,
}: {
  index: number;
  locale: Locale;
  preset: PresetId;
  template: TemplateId;
}) => {
  const { dims, height, width } = PRESETS[preset];
  const ratio = width / height;
  const command = `studio render ${template}${locale === "ar" ? " --locale ar" : ""}`;

  return (
    <li
      className="rail-card"
      style={
        {
          "--ratio": ratio,
          "--tilt": `${TILTS[index % TILTS.length]}deg`,
        } as CSSProperties
      }
    >
      <figure className="rail-card-frame">
        <Image
          src={`/gallery/templates/${template}.${locale}.${preset}.webp`}
          alt={`${template} rendered at ${dims}${locale === "ar" ? " in Arabic, right to left" : ""}`}
          fill
          sizes={`(min-width: 640px) ${Math.round(CARD_HEIGHT * ratio)}px, ${Math.round(CARD_HEIGHT_SM * ratio)}px`}
          className="object-cover"
        />
        <figcaption className="rail-card-meta">
          <span className="rail-meta-line">
            <span className="text-white">
              {templateRail.templates[template]}
            </span>
            <span className="text-white/50">{dims}</span>
          </span>
          <code className="rail-meta-line text-white/75">
            <span className="text-accent">$</span> {command}
          </code>
        </figcaption>
      </figure>
    </li>
  );
};

/**
 * TemplateRail
 * The four `studio init` starters, rendered for real, drifting past in
 * two rows: English left to right, Arabic the other way. Hovering pauses
 * the drift and lifts one render to show the command behind it.
 */
export function TemplateRail() {
  const [paused, setPaused] = useState(false);

  return (
    <section
      className="template-rail border-border relative overflow-hidden border-b py-24"
      data-paused={paused}
    >
      <div className="mx-auto max-w-5xl px-6 sm:px-8">
        <p className="text-accent mb-4 font-mono text-xs tracking-[0.2em] uppercase">
          {templateRail.eyebrow}
        </p>
        <div className="flex flex-col gap-6 sm:flex-row sm:items-end sm:justify-between">
          <div className="max-w-xl">
            <h2 className="text-foreground mb-3 text-2xl leading-snug font-medium sm:text-3xl">
              {templateRail.headline}
            </h2>
            <p className="text-fg-muted leading-relaxed">{templateRail.body}</p>
          </div>
          <button
            type="button"
            aria-pressed={paused}
            onClick={() => setPaused((value) => !value)}
            className="rail-toggle border-border text-fg-muted hover:text-foreground inline-flex shrink-0 items-center gap-2 self-start rounded-sm border px-3 py-1.5 font-mono text-xs sm:self-auto"
          >
            {paused ? (
              <Play aria-hidden="true" className="size-3" />
            ) : (
              <Pause aria-hidden="true" className="size-3" />
            )}
            {paused ? templateRail.pause.play : templateRail.pause.pause}
          </button>
        </div>
        <ul className="text-fg-faint mt-8 flex flex-wrap gap-x-6 gap-y-2 font-mono text-xs tracking-[0.15em] uppercase">
          {templateRail.stats.map((stat) => (
            <li key={stat}>{stat}</li>
          ))}
        </ul>
      </div>

      <div className="mt-10 flex flex-col gap-4">
        {templateRail.rows.map((row) => {
          const cards = ORDER[row.locale];
          return (
            <div key={row.locale}>
              <p
                lang={row.lang}
                dir={row.dir}
                className="text-fg-faint mx-auto max-w-5xl px-6 font-mono text-[11px] tracking-[0.15em] uppercase sm:px-8"
              >
                {row.label}
              </p>
              <div className="rail-viewport">
                <div
                  className="rail-track"
                  data-direction={row.dir === "rtl" ? "reverse" : "forward"}
                >
                  {/* Two identical sets: the track slides by exactly one set,
                      so the loop is seamless. The copy is hidden from
                      assistive tech so each render is announced once. */}
                  {[false, true].map((isCopy) => (
                    <ul
                      key={String(isCopy)}
                      className="rail-set"
                      aria-hidden={isCopy || undefined}
                    >
                      {cards.map(([template, preset], index) => (
                        <RailCard
                          key={`${template}-${preset}`}
                          index={index}
                          locale={row.locale}
                          preset={preset}
                          template={template}
                        />
                      ))}
                    </ul>
                  ))}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <div className="mx-auto mt-8 max-w-5xl px-6 sm:px-8">
        <Link
          href={templateRail.cta.href}
          className="rail-cta text-foreground inline-flex items-center gap-2 font-mono text-sm"
        >
          {templateRail.cta.label}
          <span aria-hidden="true" className="rail-cta-arrow text-accent">
            →
          </span>
        </Link>
      </div>
    </section>
  );
}
