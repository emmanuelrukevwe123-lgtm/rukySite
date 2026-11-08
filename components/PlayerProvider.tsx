"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { createSound, type SoundEngine } from "@/lib/sound";
import { useReducedMotion } from "@/lib/useMediaQuery";

/** Seconds for the tonearm to swing onto the record (matches the CSS transition). */
export const NEEDLE_TIME = 1.2;

type PlayerState = {
  playing: boolean;
  /** null until the first play; false if the browser has no Web Audio. */
  soundSupported: boolean | null;
  toggle: () => void;
  stop: () => void;
  heroVisible: boolean;
  setHeroVisible: (visible: boolean) => void;
};

const PlayerContext = createContext<PlayerState | null>(null);

export function usePlayer(): PlayerState {
  const ctx = useContext(PlayerContext);
  if (!ctx) throw new Error("usePlayer must be used inside <PlayerProvider>");
  return ctx;
}

export function PlayerProvider({ children }: { children: React.ReactNode }) {
  const [playing, setPlaying] = useState(false);
  const [heroVisible, setHeroVisible] = useState(true);
  const [soundSupported, setSoundSupported] = useState<boolean | null>(null);
  // undefined = not created yet; null = unsupported
  const sound = useRef<SoundEngine | null | undefined>(undefined);
  const reducedMotion = useReducedMotion();

  const start = useCallback(() => {
    // Created inside the click handler so browsers allow audio.
    if (sound.current === undefined) sound.current = createSound();
    sound.current?.start(reducedMotion ? 0.2 : NEEDLE_TIME);
    setSoundSupported(sound.current !== null);
    setPlaying(true);
  }, [reducedMotion]);

  const stop = useCallback(() => {
    sound.current?.stop();
    setPlaying(false);
  }, []);

  const toggle = useCallback(() => (playing ? stop() : start()), [playing, start, stop]);

  // Lets the brand dot (and anything else) react to playback via CSS.
  useEffect(() => {
    document.body.classList.toggle("is-playing", playing);
  }, [playing]);

  // Escape stops the record, unless a dialog (the photo viewer) is open.
  useEffect(() => {
    if (!playing) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !document.querySelector("dialog[open]")) stop();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [playing, stop]);

  useEffect(() => {
    const engine = sound;
    return () => engine.current?.stop();
  }, []);

  const value = useMemo(
    () => ({ playing, soundSupported, toggle, stop, heroVisible, setHeroVisible }),
    [playing, soundSupported, toggle, stop, heroVisible],
  );

  return <PlayerContext.Provider value={value}>{children}</PlayerContext.Provider>;
}
