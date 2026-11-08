"use client";

import Image from "next/image";
import { useEffect, useMemo, useRef, useState } from "react";
import { collage, moments, type Photo } from "@/lib/content";
import { HandArrow } from "./HandArrow";
import { Slot } from "./Slot";

type FilledPhoto = Photo & { src: string };

export function Moments() {
  const collageRef = useRef<HTMLElement>(null);
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [cycle, setCycle] = useState(0);
  const [current, setCurrent] = useState(0);

  // Every photo that has an image, in page order: collage first, then the grid.
  const gallery = useMemo(
    () => [...collage.map((c) => c.photo), ...moments].filter((p): p is FilledPhoto => Boolean(p?.src)),
    [],
  );

  // The collage assembles the first time it scrolls into view.
  useEffect(() => {
    const el = collageRef.current;
    if (!el) return;
    if (!("IntersectionObserver" in window)) {
      const id = requestAnimationFrame(() => setCycle(1));
      return () => cancelAnimationFrame(id);
    }
    const io = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setCycle((c) => c + 1);
          io.disconnect();
        }
      },
      { threshold: 0.3 },
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  function openPhoto(photo?: Photo) {
    const i = gallery.indexOf(photo as FilledPhoto);
    if (i < 0) return;
    setCurrent(i);
    dialogRef.current?.showModal();
  }

  const show = (i: number) => setCurrent((i + gallery.length) % gallery.length);
  const shown = gallery[current];

  // Alternate between two identical keyframes so "Replay" restarts the animation.
  const stageClass = ["collage-stage", cycle > 0 && (cycle % 2 ? "play-a" : "play-b")].filter(Boolean).join(" ");

  return (
    <section id="moments" className="moments">
      <div className="container moments-inner">
        <div className="section-head moments-head">
          <div className="arrow-host">
            <h2 className="h2-md">Photographs &amp; media</h2>
            <HandArrow shape="short" className="section-arrow arrow-md" />
          </div>
          <p className="moments-intro">Stills and frames from behind the camera.</p>
        </div>

        <div className="moments-body">
        <figure className="collage" ref={collageRef}>
          <div className={stageClass}>
            {collage.map((piece, i) => (
              <div
                key={i}
                className="piece"
                style={
                  {
                    "--x": `${piece.x}%`,
                    "--y": `${piece.y}%`,
                    "--w": `${piece.w}%`,
                    "--h": `${piece.h}%`,
                    "--r": `${piece.tilt}deg`,
                    "--z": piece.z,
                    "--i": i,
                  } as React.CSSProperties
                }
              >
                <div className="piece-inner">
                  <Slot label={piece.label} photo={piece.photo} sizes="260px" onOpen={() => openPhoto(piece.photo)} />
                </div>
              </div>
            ))}
          </div>
          <figcaption className="collage-foot">
            <span>A few pieces of me</span>
            <button type="button" className="replay" onClick={() => setCycle((c) => c + 1)}>
              Replay
            </button>
          </figcaption>
        </figure>

        <div className="moments-grid">
          {moments.map((photo, i) => (
            <div key={i} className={`m m${i + 1}`}>
              <Slot label="Photo" photo={photo} sizes="(max-width: 640px) 100vw, 50vw" onOpen={() => openPhoto(photo)} />
            </div>
          ))}
        </div>
        </div>
      </div>

      <dialog
        ref={dialogRef}
        className="lightbox"
        aria-label="Photo viewer"
        onClick={(e) => e.target === e.currentTarget && e.currentTarget.close()}
        onKeyDown={(e) => {
          if (gallery.length < 2) return;
          if (e.key === "ArrowLeft") show(current - 1);
          if (e.key === "ArrowRight") show(current + 1);
        }}
      >
        {shown && (
          <figure className="lightbox-figure">
            <div className="lightbox-frame">
              <Image src={shown.src} alt={shown.alt ?? ""} fill sizes="92vw" />
            </div>
            <figcaption>{shown.caption ?? shown.alt ?? ""}</figcaption>
          </figure>
        )}
        <div className="lightbox-controls">
          {gallery.length > 1 && (
            <button type="button" onClick={() => show(current - 1)}>
              Previous
            </button>
          )}
          <button type="button" autoFocus onClick={() => dialogRef.current?.close()}>
            Close
          </button>
          {gallery.length > 1 && (
            <button type="button" onClick={() => show(current + 1)}>
              Next
            </button>
          )}
        </div>
      </dialog>
    </section>
  );
}
