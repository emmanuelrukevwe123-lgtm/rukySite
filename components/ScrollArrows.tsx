"use client";

import { useEffect } from "react";

const clamp01 = (n: number) => Math.min(1, Math.max(0, n));

/**
 * Ties every hand-drawn arrow to the scroll position: an arrow starts drawing when it
 * enters the lower part of the screen and finishes (arrowhead last) by the time it
 * reaches the middle. Scrolling back up un-draws it. With reduced motion, arrows are
 * shown fully drawn and still.
 */
export function ScrollArrows() {
  useEffect(() => {
    const arrows = Array.from(document.querySelectorAll<SVGSVGElement>("[data-scroll-draw]"));
    if (!arrows.length) return;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)");
    let raf = 0;

    const paint = (el: SVGSVGElement, progress: number) => {
      el.style.setProperty("--line", Math.min(1, progress / 0.8).toFixed(3));
      el.style.setProperty("--head", clamp01((progress - 0.8) / 0.2).toFixed(3));
      // A slight swing that settles as the arrow finishes drawing.
      el.style.setProperty("--tilt", `${((1 - progress) * -9).toFixed(2)}deg`);
    };

    const update = () => {
      raf = 0;
      const vh = window.innerHeight;
      for (const el of arrows) {
        if (reduce.matches) {
          paint(el, 1);
          continue;
        }
        if (el.getClientRects().length === 0) continue; // hidden at this screen size
        // Measure the arrow's (untilted) container, so the tilt itself can't feed back into the progress.
        const top = (el.parentElement ?? el).getBoundingClientRect().top;
        paint(el, clamp01((vh * 0.92 - top) / (vh * 0.45)));
      }
    };

    const schedule = () => {
      if (!raf) raf = requestAnimationFrame(update);
    };

    update();
    window.addEventListener("scroll", schedule, { passive: true });
    window.addEventListener("resize", schedule);
    reduce.addEventListener("change", schedule);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("scroll", schedule);
      window.removeEventListener("resize", schedule);
      reduce.removeEventListener("change", schedule);
    };
  }, []);

  return null;
}
