"use client";

import { useEffect, useRef, useState } from "react";
import { NEEDLE_TIME, usePlayer } from "./PlayerProvider";
import { useReducedMotion } from "@/lib/useMediaQuery";

const RPM_DEG_PER_SEC = (100 / 3 / 60) * 360; // 33⅓ rpm = 200°/s

export function Turntable() {
  const { playing, soundSupported, toggle, setHeroVisible } = usePlayer();
  const reducedMotion = useReducedMotion();
  const artRef = useRef<HTMLDivElement>(null);
  const discRef = useRef<HTMLDivElement>(null);
  const spin = useRef({ angle: 0, velocity: 0, target: 0, last: 0, raf: 0 });
  const [tracking, setTracking] = useState(false);

  // Once the needle lands, the arm creeps slowly inward (CSS handles the motion).
  useEffect(() => {
    if (!playing) return;
    const id = window.setTimeout(() => setTracking(true), NEEDLE_TIME * 1000 + 50);
    return () => {
      window.clearTimeout(id);
      setTracking(false);
    };
  }, [playing]);

  // Platter physics: eases up to 33⅓ rpm, coasts down slowly when stopped.
  useEffect(() => {
    if (reducedMotion) return;
    const s = spin.current;
    s.target = playing ? RPM_DEG_PER_SEC : 0;

    const frame = (t: number) => {
      const dt = s.last ? Math.min(0.05, (t - s.last) / 1000) : 0;
      s.last = t;
      const tau = s.target > s.velocity ? 0.45 : 0.9;
      s.velocity += (s.target - s.velocity) * (1 - Math.exp(-dt / tau));
      s.angle = (s.angle + s.velocity * dt) % 360;
      if (discRef.current) discRef.current.style.transform = `rotate(${s.angle}deg)`;
      if (s.target === 0 && s.velocity < 0.5) {
        s.velocity = 0;
        s.last = 0;
        s.raf = 0;
        return;
      }
      s.raf = requestAnimationFrame(frame);
    };

    if (!s.raf) s.raf = requestAnimationFrame(frame);
  }, [playing, reducedMotion]);

  useEffect(() => {
    const s = spin.current;
    return () => cancelAnimationFrame(s.raf);
  }, []);

  // Tell the floating stop button whether the turntable is on screen.
  useEffect(() => {
    const el = artRef.current;
    if (!el || !("IntersectionObserver" in window)) return;
    const io = new IntersectionObserver(([entry]) => setHeroVisible(entry.isIntersecting), { threshold: 0.15 });
    io.observe(el);
    return () => io.disconnect();
  }, [setHeroVisible]);

  const note = !playing
    ? "A quiet loop, with sound"
    : soundSupported === false
      ? "This browser can’t play sound, but the record still spins"
      : "Generated live in your browser";

  const classes = ["hero-art", playing && "is-playing", playing && tracking && "is-tracking"].filter(Boolean).join(" ");

  return (
    <div className={classes} ref={artRef}>
      <div className="hero-ring" aria-hidden="true" />

      <div className="turntable" aria-hidden="true" onClick={toggle}>
        <div className="platter" />
        <div className="disc" ref={discRef}>
          <div className="disc-label">
            <svg className="disc-label-text" viewBox="0 0 100 100">
              <defs>
                <path id="arc-top" d="M 13,50 A 37,37 0 0 1 87,50" />
                <path id="arc-bottom" d="M 6,50 A 44,44 0 0 0 94,50" />
              </defs>
              <text>
                <textPath href="#arc-top" startOffset="50%" textAnchor="middle">
                  Manuel‑Ruky
                </textPath>
              </text>
              <text>
                <textPath href="#arc-bottom" startOffset="50%" textAnchor="middle">
                  side A
                </textPath>
              </text>
            </svg>
            <div className="disc-label-ring" />
            <div className="disc-spindle" />
          </div>
        </div>
        <div className="disc-sheen" />
        <div className="tonearm">
          <div className="tonearm-pivot" />
          <div className="tonearm-arm">
            <div className="tonearm-head" />
          </div>
        </div>
      </div>

      <div className="player">
        <button type="button" className="play-btn" aria-pressed={playing} onClick={toggle}>
          {playing ? (
            <svg width="12" height="12" viewBox="0 0 12 12" aria-hidden="true">
              <rect x="2" y="2" width="8" height="8" rx="1" fill="currentColor" />
            </svg>
          ) : (
            <svg width="12" height="12" viewBox="0 0 12 12" aria-hidden="true">
              <path d="M2.5 1.5v9l8-4.5z" fill="currentColor" />
            </svg>
          )}
          <span>{playing ? "Stop the record" : "Play a record"}</span>
        </button>
        <p className="player-note" aria-live="polite">
          {note}
        </p>
      </div>
    </div>
  );
}

export function MiniPlayer() {
  const { playing, heroVisible, stop } = usePlayer();
  return (
    <button
      type="button"
      className={`mini-player${playing && !heroVisible ? " is-visible" : ""}`}
      onClick={stop}
    >
      <span className="mini-disc" aria-hidden="true" />
      <span>Stop the record</span>
    </button>
  );
}
