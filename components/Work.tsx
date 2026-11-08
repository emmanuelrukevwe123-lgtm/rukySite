"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { projects } from "@/lib/content";
import { useReducedMotion } from "@/lib/useMediaQuery";
import { HandArrow } from "./HandArrow";
import { Slot } from "./Slot";

export function Work() {
  const railRef = useRef<HTMLDivElement>(null);
  const reducedMotion = useReducedMotion();
  const [label, setLabel] = useState(`${projects.length} projects`);
  const [atStart, setAtStart] = useState(true);
  const [atEnd, setAtEnd] = useState(false);

  const metrics = useCallback(() => {
    const rail = railRef.current!;
    const style = getComputedStyle(rail);
    const gap = parseFloat(style.columnGap) || 0;
    const pad = parseFloat(style.paddingLeft) || 0;
    const card = rail.firstElementChild as HTMLElement;
    const step = card.getBoundingClientRect().width + gap;
    const perView = Math.max(1, Math.floor((rail.clientWidth - pad * 2 + gap + 4) / step));
    return { rail, step, perView };
  }, []);

  const update = useCallback(() => {
    const { rail, step, perView } = metrics();
    const first = Math.min(projects.length - 1, Math.round(rail.scrollLeft / step));
    const last = Math.min(projects.length, first + perView);
    setLabel(perView === 1 ? `${first + 1} of ${projects.length}` : `${first + 1}–${last} of ${projects.length}`);
    setAtStart(rail.scrollLeft <= 2);
    setAtEnd(rail.scrollLeft >= rail.scrollWidth - rail.clientWidth - 2);
  }, [metrics]);

  useEffect(() => {
    const rail = railRef.current!;
    let tick = 0;
    const onScroll = () => {
      if (tick) return;
      tick = requestAnimationFrame(() => {
        tick = 0;
        update();
      });
    };
    rail.addEventListener("scroll", onScroll, { passive: true });
    // Also fires once right away, which sets the initial label.
    const ro = new ResizeObserver(() => update());
    ro.observe(rail);
    return () => {
      rail.removeEventListener("scroll", onScroll);
      ro.disconnect();
      cancelAnimationFrame(tick);
    };
  }, [update]);

  function page(direction: -1 | 1) {
    const { rail, step, perView } = metrics();
    rail.scrollBy({ left: direction * step * perView, behavior: reducedMotion ? "auto" : "smooth" });
  }

  return (
    <section id="work" className="work">
      <div className="work-inner">
        <div className="section-head work-head">
          <div className="arrow-host">
            <h2 className="h2-xl">Selected projects</h2>
            <p className="work-intro">A handful of things I’ve built recently — each one made slowly, with care.</p>
            <HandArrow shape="long" className="section-arrow arrow-xl" />
          </div>
          <div className="pager">
            <span className="pager-label" aria-live="polite">
              {label}
            </span>
            <button type="button" className="pager-btn" aria-label="Previous projects" disabled={atStart} onClick={() => page(-1)}>
              &larr;
            </button>
            <button type="button" className="pager-btn" aria-label="Next projects" disabled={atEnd} onClick={() => page(1)}>
              &rarr;
            </button>
          </div>
        </div>

        <div className="rail" ref={railRef} tabIndex={0} aria-label="Projects, scroll sideways for more">
          {projects.map((p) => (
            <article
              key={p.title}
              className="project"
              style={{ "--grad": p.gradient, "--on": p.onColor } as React.CSSProperties}
            >
              <div className="project-art">
                <div className="project-shot">
                  <Slot label="Project screenshot" photo={p.screenshot} sizes="(max-width: 640px) 80vw, 33vw" />
                </div>
                <span className="project-kind">{p.kind}</span>
                <span className="project-year">{p.year}</span>
              </div>
              <h3>
                <a href={p.href} className="project-link">
                  {p.title}
                </a>
              </h3>
              <p>{p.description}</p>
              {p.live && (
                <a href={p.live} className="project-live">
                  Open the live site
                </a>
              )}
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
