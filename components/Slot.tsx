"use client";

import Image from "next/image";
import { useState } from "react";
import type { Photo } from "@/lib/content";

type SlotProps = {
  /** Placeholder caption shown while the frame is empty. */
  label: string;
  photo?: Photo;
  /** Rough rendered width, so the browser can pick a sensible image size. */
  sizes?: string;
  /** Makes a filled frame open the photo viewer. */
  onOpen?: () => void;
};

/** A photo frame. Shows the photo if there is one, otherwise a quiet dashed placeholder. */
export function Slot({ label, photo, sizes = "50vw", onOpen }: SlotProps) {
  const [failed, setFailed] = useState(false);
  const filled = Boolean(photo?.src) && !failed;
  const zoomable = filled && Boolean(onOpen);

  return (
    <div
      className={`slot${zoomable ? " is-zoomable" : ""}`}
      data-label={label}
      {...(zoomable && {
        role: "button",
        tabIndex: 0,
        "aria-label": `View photo${photo?.alt ? `: ${photo.alt}` : ""}`,
        onClick: onOpen,
        onKeyDown: (e: React.KeyboardEvent) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            onOpen?.();
          }
        },
      })}
    >
      {filled && photo?.src && (
        <Image src={photo.src} alt={photo.alt ?? ""} fill sizes={sizes} onError={() => setFailed(true)} />
      )}
    </div>
  );
}
