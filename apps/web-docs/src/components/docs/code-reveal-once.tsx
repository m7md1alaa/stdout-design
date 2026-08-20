"use client";

import { useEffect } from "react";

/**
 * The docs' one signature motion moment: the first code block on a page
 * gets a single shimmer sweep the first time it scrolls into view, then
 * settles for good. Deliberately not a per-block or looping effect —
 * see .code-reveal-once / @keyframes code-reveal-sweep in global.css.
 */
export function CodeRevealOnce() {
  useEffect(() => {
    const first = document.querySelector<HTMLElement>(
      "#nd-page figure.shiki"
    );
    if (!first || first.dataset.observed) return;
    first.dataset.observed = "true";

    const io = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            first.classList.add("code-reveal-once");
            io.disconnect();
          }
        }
      },
      { threshold: 0.3 }
    );
    io.observe(first);
    return () => io.disconnect();
  }, []);

  return null;
}
