/* Manuel‑Ruky — Minimal
 * Content lives in index.html. This file only adds behaviour on top of it.
 */
(() => {
  "use strict";

  const $ = (sel, root = document) => root.querySelector(sel);
  const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];
  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  /* ========================================================================
   * Photo frames: if an <img> fails to load, drop it so the placeholder shows.
   * ====================================================================== */
  $$(".slot > img").forEach((img) => {
    const drop = () => img.remove();
    if (img.complete && img.naturalWidth === 0 && img.getAttribute("src")) drop();
    else img.addEventListener("error", drop, { once: true });
  });

  /* ========================================================================
   * The record player — sound is generated live with the Web Audio API.
   * A slow loop of four warm chords (Fmaj9 → Em7 → Dm9 → B♭maj9), a soft
   * bass, a few stray keys, tape-like wobble, and vinyl crackle.
   * ====================================================================== */
  function createSound() {
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return null;

    const CHORDS = [
      [53, 57, 60, 64, 67], // Fmaj9
      [52, 55, 59, 62, 67], // Em7
      [50, 57, 60, 64, 65], // Dm9
      [46, 53, 57, 60, 62], // B♭maj9
    ];
    const BAR = 8;          // seconds per chord
    const LOOKAHEAD = 10;   // seconds scheduled ahead
    const hz = (m) => 440 * Math.pow(2, (m - 69) / 12);

    let ctx, master, bus, wowDepth, timer = 0, suspendTimer = 0, nextAt = 0, step = 0;
    const live = new Set();

    function build() {
      ctx = new AC();
      const comp = ctx.createDynamicsCompressor();
      comp.threshold.value = -20;
      comp.ratio.value = 3;
      comp.connect(ctx.destination);

      master = ctx.createGain();
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
      bus = tone;

      // Wow & flutter: a slow pitch wobble shared by every voice
      const wow = ctx.createOscillator();
      wow.frequency.value = 0.55;
      wowDepth = ctx.createGain();
      wowDepth.gain.value = 5; // cents
      wow.connect(wowDepth);
      wow.start();

      // Vinyl crackle: faint hiss with sparse pops, looped
      const len = ctx.sampleRate * 4;
      const buf = ctx.createBuffer(1, len, ctx.sampleRate);
      const data = buf.getChannelData(0);
      for (let i = 0; i < len; i++) {
        let s = (Math.random() * 2 - 1) * 0.01;
        if (Math.random() < 0.00018) {
          const amp = (Math.random() * 2 - 1) * (0.3 + Math.random() * 0.6);
          for (let k = 0; k < 6 && i + k < len; k++) data[i + k] += amp * Math.pow(0.45, k);
        }
        data[i] += s;
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
    }

    function voice(type, freq, detune) {
      const o = ctx.createOscillator();
      o.type = type;
      o.frequency.value = freq;
      o.detune.value = detune;
      wowDepth.connect(o.detune);
      return o;
    }

    function keep(o, start, stop) {
      live.add(o);
      o.onended = () => {
        live.delete(o);
        try { wowDepth.disconnect(o.detune); } catch (_) { /* already gone */ }
      };
      o.start(start);
      o.stop(stop);
    }

    function pan(value) {
      const p = ctx.createStereoPanner ? ctx.createStereoPanner() : ctx.createGain();
      if (p.pan) p.pan.value = value;
      return p;
    }

    function chord(notes, t) {
      const end = t + BAR + 3;

      notes.forEach((m, i) => {
        const g = ctx.createGain();
        g.gain.setValueAtTime(0, t);
        g.gain.linearRampToValueAtTime(0.028, t + 2.5);
        g.gain.setValueAtTime(0.028, t + BAR - 0.5);
        g.gain.linearRampToValueAtTime(0, end);
        g.connect(pan((i / (notes.length - 1)) * 1.2 - 0.6)).connect(bus);
        const a = voice("sine", hz(m), -6);
        const b = voice("triangle", hz(m), 7);
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
      bg.connect(bus);
      const bass = voice("sine", hz(notes[0] - 12), 0);
      bass.connect(bg);
      keep(bass, t, t + BAR + 1.6);

      // A few stray keys
      const count = 2 + Math.floor(Math.random() * 3);
      for (let k = 0; k < count; k++) {
        const at = t + 1 + Math.random() * (BAR - 2);
        const m = notes[1 + Math.floor(Math.random() * (notes.length - 1))] + 12;
        key(m, at);
      }
    }

    function key(m, t) {
      const g = ctx.createGain();
      g.gain.setValueAtTime(0, t);
      g.gain.linearRampToValueAtTime(0.05, t + 0.015);
      g.gain.exponentialRampToValueAtTime(0.0008, t + 3.2);
      g.connect(pan(Math.random() * 0.8 - 0.4)).connect(bus);
      const body = voice("sine", hz(m), 0);
      const bell = voice("sine", hz(m) * 2, 3);
      const bellLevel = ctx.createGain();
      bellLevel.gain.value = 0.25;
      body.connect(g);
      bell.connect(bellLevel).connect(g);
      keep(body, t, t + 3.3);
      keep(bell, t, t + 3.3);
    }

    function pump() {
      while (nextAt < ctx.currentTime + LOOKAHEAD) {
        chord(CHORDS[step % CHORDS.length], nextAt);
        nextAt += BAR;
        step += 1;
      }
    }

    function rampMaster(to, at, over) {
      const g = master.gain;
      const now = ctx.currentTime;
      g.cancelScheduledValues(now);
      g.setValueAtTime(g.value, now);
      g.setValueAtTime(g.value, Math.max(now, at));
      g.linearRampToValueAtTime(to, Math.max(now, at) + over);
    }

    return {
      /** Start after `delay` seconds (time for the needle to land). */
      start(delay) {
        if (!ctx) build();
        clearTimeout(suspendTimer);
        ctx.resume();
        const now = ctx.currentTime;
        // Silence anything left over from a previous play, then begin fresh.
        rampMaster(0, now, 0.15);
        live.forEach((o) => { try { o.stop(now + 0.2); } catch (_) { /* ok */ } });
        const drop = now + delay;
        master.gain.setValueAtTime(0, drop);
        master.gain.linearRampToValueAtTime(0.9, drop + 0.3);
        nextAt = drop + 0.6;
        step = 0;
        pump();
        clearInterval(timer);
        timer = setInterval(pump, 1000);
      },
      stop() {
        if (!ctx) return;
        clearInterval(timer);
        const now = ctx.currentTime;
        rampMaster(0, now, 0.8);
        live.forEach((o) => { try { o.stop(now + 0.9); } catch (_) { /* ok */ } });
        suspendTimer = setTimeout(() => ctx.suspend(), 1200);
      },
    };
  }

  /* ---------------- Turntable UI ---------------- */
  const heroArt = $("#hero-art");
  const disc = $("#disc");
  const playBtn = $("#play-btn");
  const playLabel = $(".play-label", playBtn);
  const note = $("#player-note");
  const mini = $("#mini-player");
  const NEEDLE_TIME = 1.2; // matches the tonearm transition in CSS

  const sound = createSound();
  let playing = false;
  let landTimer = 0;
  let heroVisible = true;

  // Platter physics: eases up to 33⅓ rpm, coasts down slowly when stopped.
  const RPM_DEG = (100 / 3 / 60) * 360; // 200°/s
  let angle = 0, velocity = 0, target = 0, last = 0, raf = 0;
  function spinFrame(t) {
    const dt = last ? Math.min(0.05, (t - last) / 1000) : 0;
    last = t;
    const tau = target > velocity ? 0.45 : 0.9;
    velocity += (target - velocity) * (1 - Math.exp(-dt / tau));
    angle = (angle + velocity * dt) % 360;
    disc.style.transform = `rotate(${angle}deg)`;
    if (target === 0 && velocity < 0.5) { velocity = 0; raf = 0; last = 0; return; }
    raf = requestAnimationFrame(spinFrame);
  }
  function setSpin(on) {
    if (reduceMotion) return;
    target = on ? RPM_DEG : 0;
    if (!raf) raf = requestAnimationFrame(spinFrame);
  }

  function updateMini() {
    mini.classList.toggle("is-visible", playing && !heroVisible);
  }

  function setPlaying(on) {
    playing = on;
    document.body.classList.toggle("is-playing", on);
    heroArt.classList.toggle("is-playing", on);
    heroArt.classList.remove("is-tracking");
    clearTimeout(landTimer);
    playBtn.setAttribute("aria-pressed", String(on));
    playLabel.textContent = on ? "Stop the record" : "Play a record";
    setSpin(on);

    if (on) {
      note.textContent = sound ? "Generated live in your browser" : "This browser can’t play sound, but the record still spins";
      if (sound) sound.start(reduceMotion ? 0.2 : NEEDLE_TIME);
      landTimer = setTimeout(() => heroArt.classList.add("is-tracking"), NEEDLE_TIME * 1000 + 50);
    } else {
      note.textContent = "A quiet loop, with sound";
      if (sound) sound.stop();
    }
    updateMini();
  }

  playBtn.addEventListener("click", () => setPlaying(!playing));
  $("#turntable").addEventListener("click", () => setPlaying(!playing));
  mini.addEventListener("click", () => setPlaying(false));
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && playing && !$("#lightbox").open) setPlaying(false);
  });

  if ("IntersectionObserver" in window) {
    new IntersectionObserver(([entry]) => {
      heroVisible = entry.isIntersecting;
      updateMini();
    }, { threshold: 0.15 }).observe(heroArt);
  }

  /* ========================================================================
   * Nav: mark the section currently in view
   * ====================================================================== */
  const navLinks = $$(".nav-links a");
  if ("IntersectionObserver" in window) {
    const byId = new Map(navLinks.map((a) => [a.getAttribute("href").slice(1), a]));
    const io = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        navLinks.forEach((a) => a.removeAttribute("aria-current"));
        const link = byId.get(entry.target.id);
        if (link) link.setAttribute("aria-current", "true");
      });
    }, { rootMargin: "-45% 0px -50% 0px" });
    byId.forEach((_, id) => { const s = document.getElementById(id); if (s) io.observe(s); });
    // Clear the marker when back at the hero
    new IntersectionObserver(([e]) => {
      if (e.isIntersecting) navLinks.forEach((a) => a.removeAttribute("aria-current"));
    }, { rootMargin: "-45% 0px -50% 0px" }).observe($("#top"));
  }

  /* ========================================================================
   * Work: sideways rail with arrow buttons and a position label
   * ====================================================================== */
  const rail = $("#rail");
  const cards = $$(".project", rail);
  const prevBtn = $("#prev-page");
  const nextBtn = $("#next-page");
  const pagerLabel = $("#pager-label");

  function railMetrics() {
    const gap = parseFloat(getComputedStyle(rail).columnGap) || 0;
    const stepW = cards[0].getBoundingClientRect().width + gap;
    const perView = Math.max(1, Math.floor((rail.clientWidth - parseFloat(getComputedStyle(rail).paddingLeft) * 2 + gap + 4) / stepW));
    return { stepW, perView };
  }

  function updateRail() {
    const { stepW, perView } = railMetrics();
    const first = Math.min(cards.length - 1, Math.round(rail.scrollLeft / stepW));
    const lastShown = Math.min(cards.length, first + perView);
    pagerLabel.textContent = perView === 1
      ? `${first + 1} of ${cards.length}`
      : `${first + 1}–${lastShown} of ${cards.length}`;
    const max = rail.scrollWidth - rail.clientWidth;
    prevBtn.disabled = rail.scrollLeft <= 2;
    nextBtn.disabled = rail.scrollLeft >= max - 2;
  }

  function page(dir) {
    const { stepW, perView } = railMetrics();
    rail.scrollBy({ left: dir * stepW * perView, behavior: reduceMotion ? "auto" : "smooth" });
  }

  prevBtn.addEventListener("click", () => page(-1));
  nextBtn.addEventListener("click", () => page(1));
  let railTick = 0;
  rail.addEventListener("scroll", () => {
    if (railTick) return;
    railTick = requestAnimationFrame(() => { railTick = 0; updateRail(); });
  }, { passive: true });
  window.addEventListener("resize", updateRail);
  updateRail();

  /* ========================================================================
   * Journal: topic filter with counts + single-open accordion
   * ====================================================================== */
  const tracks = $$(".track");
  const catButtons = $$(".cat");

  catButtons.forEach((btn) => {
    const cat = btn.dataset.cat;
    const n = cat === "All" ? tracks.length : tracks.filter((t) => t.dataset.cat === cat).length;
    $(".cat-count", btn).textContent = n;
  });

  function setOpen(track, open) {
    track.classList.toggle("is-open", open);
    $(".track-toggle", track).setAttribute("aria-expanded", String(open));
    $(".track-body", track).inert = !open;
  }
  tracks.forEach((t) => setOpen(t, t.classList.contains("is-open")));

  $("#tracklist").addEventListener("click", (e) => {
    const toggle = e.target.closest(".track-toggle");
    if (!toggle) return;
    const track = toggle.closest(".track");
    const willOpen = !track.classList.contains("is-open");
    tracks.forEach((t) => setOpen(t, t === track && willOpen));
  });

  $("#cats").addEventListener("click", (e) => {
    const btn = e.target.closest(".cat");
    if (!btn) return;
    const cat = btn.dataset.cat;
    catButtons.forEach((b) => b.setAttribute("aria-pressed", String(b === btn)));
    tracks.forEach((t) => {
      const show = cat === "All" || t.dataset.cat === cat;
      t.hidden = !show;
      if (!show) setOpen(t, false);
    });
  });

  /* ========================================================================
   * Moments: collage assembles once it scrolls into view
   * ====================================================================== */
  const stage = $("#collage-stage");
  let cycle = 0;
  function playCollage() {
    cycle += 1;
    // Alternate between two identical keyframes so the animation restarts.
    stage.classList.toggle("play-a", cycle % 2 === 1);
    stage.classList.toggle("play-b", cycle % 2 === 0);
  }
  $("#replay").addEventListener("click", playCollage);
  if ("IntersectionObserver" in window) {
    const io = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) { playCollage(); io.disconnect(); }
    }, { threshold: 0.3 });
    io.observe($("#collage"));
  } else {
    playCollage();
  }

  /* ========================================================================
   * Photo viewer for filled frames in Moments
   * ====================================================================== */
  const lightbox = $("#lightbox");
  const lbImg = $("#lightbox-img");
  const lbCaption = $("#lightbox-caption");
  const lbPrev = $("#lightbox-prev");
  const lbNext = $("#lightbox-next");
  let gallery = [];
  let current = 0;

  function photoSlots() {
    return $$("#moments .slot").filter((s) => {
      const img = $(":scope > img", s);
      return img && img.naturalWidth > 0;
    });
  }

  function showPhoto(i) {
    current = (i + gallery.length) % gallery.length;
    const slot = gallery[current];
    const img = $(":scope > img", slot);
    lbImg.src = img.currentSrc || img.src;
    lbImg.alt = img.alt;
    lbCaption.textContent = slot.dataset.caption || img.alt || "";
  }

  function openPhoto(slot) {
    gallery = photoSlots();
    const i = gallery.indexOf(slot);
    if (i < 0) return;
    lbPrev.hidden = lbNext.hidden = gallery.length < 2;
    showPhoto(i);
    lightbox.showModal();
  }

  function markZoomable(slot) {
    const img = $(":scope > img", slot);
    if (!img || slot.classList.contains("is-zoomable")) return;
    slot.classList.add("is-zoomable");
    slot.tabIndex = 0;
    slot.setAttribute("role", "button");
    slot.setAttribute("aria-label", `View photo${img.alt ? ": " + img.alt : ""}`);
  }

  $$("#moments .slot").forEach((slot) => {
    const img = $(":scope > img", slot);
    if (!img) return;
    if (img.complete && img.naturalWidth > 0) markZoomable(slot);
    else img.addEventListener("load", () => markZoomable(slot), { once: true });
  });

  $("#moments").addEventListener("click", (e) => {
    const slot = e.target.closest(".slot.is-zoomable");
    if (slot) openPhoto(slot);
  });
  $("#moments").addEventListener("keydown", (e) => {
    const slot = e.target.closest(".slot.is-zoomable");
    if (slot && (e.key === "Enter" || e.key === " ")) { e.preventDefault(); openPhoto(slot); }
  });

  lbPrev.addEventListener("click", () => showPhoto(current - 1));
  lbNext.addEventListener("click", () => showPhoto(current + 1));
  $("#lightbox-close").addEventListener("click", () => lightbox.close());
  lightbox.addEventListener("click", (e) => { if (e.target === lightbox) lightbox.close(); });
  lightbox.addEventListener("keydown", (e) => {
    if (gallery.length < 2) return;
    if (e.key === "ArrowLeft") showPhoto(current - 1);
    if (e.key === "ArrowRight") showPhoto(current + 1);
  });

  /* ========================================================================
   * Contact: copy the email address
   * ====================================================================== */
  const copyBtn = $("#copy-btn");
  const email = $("#contact-email").textContent.trim();
  let copyTimer = 0;

  async function copyText(text) {
    if (navigator.clipboard && window.isSecureContext) {
      try {
        await navigator.clipboard.writeText(text);
        return;
      } catch (_) { /* permission denied: fall through to the older method */ }
    }
    const ta = document.createElement("textarea");
    ta.value = text;
    ta.setAttribute("readonly", "");
    ta.style.cssText = "position:fixed;opacity:0;pointer-events:none";
    document.body.appendChild(ta);
    ta.select();
    const ok = document.execCommand("copy");
    ta.remove();
    if (!ok) throw new Error("copy failed");
  }

  copyBtn.addEventListener("click", async () => {
    clearTimeout(copyTimer);
    try {
      await copyText(email);
      copyBtn.textContent = "Copied";
      copyBtn.classList.add("is-done");
    } catch (_) {
      copyBtn.textContent = "Select the address to copy";
    }
    copyTimer = setTimeout(() => {
      copyBtn.textContent = "Copy";
      copyBtn.classList.remove("is-done");
    }, 2200);
  });
})();
