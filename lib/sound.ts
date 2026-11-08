/**
 * The record player's sound, generated live with the Web Audio API.
 * A slow loop of four warm chords (Fmaj9 → Em7 → Dm9 → B♭maj9), a soft bass,
 * a few stray keys, tape-like wobble, and vinyl crackle. No audio files.
 */

export type SoundEngine = {
  /** Start playing after `delay` seconds (time for the needle to land). */
  start(delay: number): void;
  /** Fade out and stop. */
  stop(): void;
};

const CHORDS: number[][] = [
  [53, 57, 60, 64, 67], // Fmaj9
  [52, 55, 59, 62, 67], // Em7
  [50, 57, 60, 64, 65], // Dm9
  [46, 53, 57, 60, 62], // B♭maj9
];
const BAR = 8; // seconds per chord
const LOOKAHEAD = 10; // seconds scheduled ahead
const hz = (midi: number) => 440 * Math.pow(2, (midi - 69) / 12);

type WebkitWindow = Window & { webkitAudioContext?: typeof AudioContext };

/** Returns null when the browser has no Web Audio support. Call from a click handler. */
export function createSound(): SoundEngine | null {
  const AC = window.AudioContext ?? (window as WebkitWindow).webkitAudioContext;
  if (!AC) return null;

  const ctx = new AC();
  const live = new Set<OscillatorNode>();
  let timer = 0;
  let suspendTimer = 0;
  let nextAt = 0;
  let step = 0;

  // Output chain
  const comp = ctx.createDynamicsCompressor();
  comp.threshold.value = -20;
  comp.ratio.value = 3;
  comp.connect(ctx.destination);

  const master = ctx.createGain();
  master.gain.value = 0;
  master.connect(comp);

  // Warm tone with a very slow filter sweep
  const tone = ctx.createBiquadFilter();
  tone.type = "lowpass";
  tone.frequency.value = 1100;
  tone.Q.value = 0.4;
  const sweep = ctx.createOscillator();
  sweep.frequency.value = 0.04;
  const sweepDepth = ctx.createGain();
  sweepDepth.gain.value = 350;
  sweep.connect(sweepDepth).connect(tone.frequency);
  sweep.start();

  // A small room: damped feedback delay
  const delay = ctx.createDelay(2);
  delay.delayTime.value = 0.42;
  const feedback = ctx.createGain();
  feedback.gain.value = 0.38;
  const damp = ctx.createBiquadFilter();
  damp.type = "lowpass";
  damp.frequency.value = 1800;
  const wet = ctx.createGain();
  wet.gain.value = 0.28;
  tone.connect(master);
  tone.connect(delay);
  delay.connect(damp).connect(feedback).connect(delay);
  damp.connect(wet).connect(master);

  // Wow & flutter: a slow pitch wobble shared by every voice (in cents)
  const wow = ctx.createOscillator();
  wow.frequency.value = 0.55;
  const wowDepth = ctx.createGain();
  wowDepth.gain.value = 5;
  wow.connect(wowDepth);
  wow.start();

  // Vinyl crackle: faint hiss with sparse pops, looped
  const len = ctx.sampleRate * 4;
  const buf = ctx.createBuffer(1, len, ctx.sampleRate);
  const data = buf.getChannelData(0);
  for (let i = 0; i < len; i++) {
    data[i] += (Math.random() * 2 - 1) * 0.01;
    if (Math.random() < 0.00018) {
      const amp = (Math.random() * 2 - 1) * (0.3 + Math.random() * 0.6);
      for (let k = 0; k < 6 && i + k < len; k++) data[i + k] += amp * Math.pow(0.45, k);
    }
  }
  const crackle = ctx.createBufferSource();
  crackle.buffer = buf;
  crackle.loop = true;
  const hp = ctx.createBiquadFilter();
  hp.type = "highpass";
  hp.frequency.value = 900;
  const crackleLevel = ctx.createGain();
  crackleLevel.gain.value = 0.35;
  crackle.connect(hp).connect(crackleLevel).connect(master);
  crackle.start();

  function voice(type: OscillatorType, freq: number, detune: number) {
    const o = ctx.createOscillator();
    o.type = type;
    o.frequency.value = freq;
    o.detune.value = detune;
    wowDepth.connect(o.detune);
    return o;
  }

  function keep(o: OscillatorNode, start: number, stop: number) {
    live.add(o);
    o.onended = () => {
      live.delete(o);
      try {
        wowDepth.disconnect(o.detune);
      } catch {
        /* already disconnected */
      }
    };
    o.start(start);
    o.stop(stop);
  }

  function pan(value: number): AudioNode {
    if (typeof ctx.createStereoPanner !== "function") return ctx.createGain();
    const p = ctx.createStereoPanner();
    p.pan.value = value;
    return p;
  }

  function key(midi: number, t: number) {
    const g = ctx.createGain();
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(0.05, t + 0.015);
    g.gain.exponentialRampToValueAtTime(0.0008, t + 3.2);
    g.connect(pan(Math.random() * 0.8 - 0.4)).connect(tone);
    const body = voice("sine", hz(midi), 0);
    const bell = voice("sine", hz(midi) * 2, 3);
    const bellLevel = ctx.createGain();
    bellLevel.gain.value = 0.25;
    body.connect(g);
    bell.connect(bellLevel).connect(g);
    keep(body, t, t + 3.3);
    keep(bell, t, t + 3.3);
  }

  function chord(notes: number[], t: number) {
    const end = t + BAR + 3;

    notes.forEach((midi, i) => {
      const g = ctx.createGain();
      g.gain.setValueAtTime(0, t);
      g.gain.linearRampToValueAtTime(0.028, t + 2.5);
      g.gain.setValueAtTime(0.028, t + BAR - 0.5);
      g.gain.linearRampToValueAtTime(0, end);
      g.connect(pan((i / (notes.length - 1)) * 1.2 - 0.6)).connect(tone);
      const a = voice("sine", hz(midi), -6);
      const b = voice("triangle", hz(midi), 7);
      a.connect(g);
      b.connect(g);
      keep(a, t, end);
      keep(b, t, end);
    });

    // Bass
    const bg = ctx.createGain();
    bg.gain.setValueAtTime(0, t);
    bg.gain.linearRampToValueAtTime(0.09, t + 0.4);
    bg.gain.exponentialRampToValueAtTime(0.02, t + BAR);
    bg.gain.linearRampToValueAtTime(0, t + BAR + 1.5);
    bg.connect(tone);
    const bass = voice("sine", hz(notes[0] - 12), 0);
    bass.connect(bg);
    keep(bass, t, t + BAR + 1.6);

    // A few stray keys
    const count = 2 + Math.floor(Math.random() * 3);
    for (let k = 0; k < count; k++) {
      const at = t + 1 + Math.random() * (BAR - 2);
      const midi = notes[1 + Math.floor(Math.random() * (notes.length - 1))] + 12;
      key(midi, at);
    }
  }

  function pump() {
    while (nextAt < ctx.currentTime + LOOKAHEAD) {
      chord(CHORDS[step % CHORDS.length], nextAt);
      nextAt += BAR;
      step += 1;
    }
  }

  function rampMaster(to: number, at: number, over: number) {
    const g = master.gain;
    const now = ctx.currentTime;
    const from = Math.max(now, at);
    g.cancelScheduledValues(now);
    g.setValueAtTime(g.value, now);
    g.setValueAtTime(g.value, from);
    g.linearRampToValueAtTime(to, from + over);
  }

  function stopAll(at: number) {
    live.forEach((o) => {
      try {
        o.stop(at);
      } catch {
        /* already stopped */
      }
    });
  }

  return {
    start(delaySeconds) {
      window.clearTimeout(suspendTimer);
      void ctx.resume();
      const now = ctx.currentTime;
      // Silence anything left from a previous play, then begin fresh.
      rampMaster(0, now, 0.15);
      stopAll(now + 0.2);
      const drop = now + delaySeconds;
      master.gain.setValueAtTime(0, drop);
      master.gain.linearRampToValueAtTime(0.9, drop + 0.3);
      nextAt = drop + 0.6;
      step = 0;
      pump();
      window.clearInterval(timer);
      timer = window.setInterval(pump, 1000);
    },
    stop() {
      window.clearInterval(timer);
      const now = ctx.currentTime;
      rampMaster(0, now, 0.8);
      stopAll(now + 0.9);
      suspendTimer = window.setTimeout(() => void ctx.suspend(), 1200);
    },
  };
}
