"use client";

import { useState, useSyncExternalStore } from "react";
import { constellationIcon, constellations, fieldStars, moonLitPath, moonPhase } from "@/lib/sky";

const MOON = { cx: 338, cy: 64, r: 27 };

// The moon depends on today's date, which only the visitor's browser knows.
// The page is built ahead of time, so it starts without a phase and fills it in on arrival.
const subscribe = () => () => {};
const currentHour = () => Math.floor(Date.now() / 3_600_000);
const noHour = () => null;

export function Sky() {
  const [selected, setSelected] = useState(0);
  const hour = useSyncExternalStore(subscribe, currentHour, noHour);
  const moon = hour === null ? null : moonPhase(hour * 3_600_000);
  const shown = constellations[selected];

  return (
    <section id="sky" className="sky">
      <div className="container sky-inner">
        <div className="sky-head">
          <h2 className="h2-md">Looking up</h2>
          <p className="sky-intro">
            On clear nights I go looking for these. Pick one to trace it across the sky.
          </p>

          <div className="sky-picker" role="group" aria-label="Constellations">
            {constellations.map((c, i) => (
              <button
                key={c.id}
                type="button"
                className="cat"
                aria-pressed={i === selected}
                onClick={() => setSelected(i)}
              >
                <ConstellationIcon c={c} />
                {c.name}
              </button>
            ))}
          </div>
        </div>

        <figure className="sky-chart">
          <svg viewBox="0 0 400 300" role="img" aria-label={`Star chart of ${shown.name}, with the moon in the corner`}>
            <defs>
              <radialGradient id="moon-glow">
                <stop offset="0.55" stopColor="#f4f1e6" stopOpacity="0.16" />
                <stop offset="1" stopColor="#f4f1e6" stopOpacity="0" />
              </radialGradient>
            </defs>

            {fieldStars.map((s, i) => (
              <circle key={i} cx={s.x} cy={s.y} r={s.r} fill="#f4f1e6" opacity={s.o} />
            ))}

            {/* The moon: a faint full disc, with the lit part drawn over it. */}
            <circle cx={MOON.cx} cy={MOON.cy} r={MOON.r * 1.9} fill="url(#moon-glow)" />
            <circle cx={MOON.cx} cy={MOON.cy} r={MOON.r} className="moon-dark" />
            {moon && <path d={moonLitPath(moon.cycle, MOON.cx, MOON.cy, MOON.r)} className="moon-lit" />}

            {/* Re-keyed on every pick, so the figure draws itself again. */}
            <g key={shown.id} className="figure">
              {shown.lines.map((l, i) => (
                <line key={i} {...l} pathLength={1} style={{ "--i": i } as React.CSSProperties} />
              ))}
              {shown.stars.map((s) => (
                <g key={s.name}>
                  <circle cx={s.x} cy={s.y} r={s.r * 2.6} className="star-halo" />
                  <circle cx={s.x} cy={s.y} r={s.r} className="star" />
                  {s.label && (
                    <text
                      x={s.x + (s.label === "right" ? s.r + 7 : -(s.r + 7))}
                      y={s.y + 3}
                      textAnchor={s.label === "right" ? "start" : "end"}
                    >
                      {s.name}
                    </text>
                  )}
                </g>
              ))}
            </g>
          </svg>
          <figcaption>
            {moon ? `Tonight’s moon: ${moon.name}, about ${moon.lit}% lit.` : "Tonight’s moon"}
          </figcaption>
        </figure>

        <div className="sky-about" aria-live="polite">
          <h3>{shown.name}</h3>
          <p className="sky-figure">{shown.figure}</p>
          <p>{shown.note}</p>
          <p className="sky-season">{shown.season}</p>
        </div>
      </div>
    </section>
  );
}

function ConstellationIcon({ c }: { c: (typeof constellations)[number] }) {
  const icon = constellationIcon(c);
  return (
    <svg className="cat-icon" viewBox="0 0 24 24" aria-hidden="true">
      {icon.lines.map((l, i) => (
        <line key={i} {...l} />
      ))}
      {icon.stars.map((s, i) => (
        <circle key={i} cx={s.x} cy={s.y} r={s.r} />
      ))}
    </svg>
  );
}
