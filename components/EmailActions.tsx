"use client";

import { useEffect, useRef, useState } from "react";
import { HandArrow } from "./HandArrow";

type CopyStatus = "idle" | "copied" | "failed";

async function copyText(text: string) {
  if (navigator.clipboard && window.isSecureContext) {
    try {
      await navigator.clipboard.writeText(text);
      return;
    } catch {
      /* permission denied: fall through to the older method */
    }
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

/**
 * "Email me" button, a small copy icon, and a hand-drawn arrow pointing at the button.
 * The address arrives in two parts and is only joined in the browser, when someone
 * points at, taps or focuses the button, so it never appears whole in the page HTML
 * that address-harvesting bots read.
 */
export function EmailActions({ user, domain }: { user: string; domain: string }) {
  const [copy, setCopy] = useState<CopyStatus>("idle");
  const copyTimer = useRef(0);

  useEffect(() => () => window.clearTimeout(copyTimer.current), []);


  const address = () => `${user}@${domain}`;

  // Fill in the real mailto link just before it can be used.
  const arm = (e: React.SyntheticEvent<HTMLAnchorElement>) => {
    e.currentTarget.href = `mailto:${address()}`;
  };

  async function onCopy() {
    window.clearTimeout(copyTimer.current);
    try {
      await copyText(address());
      setCopy("copied");
      copyTimer.current = window.setTimeout(() => setCopy("idle"), 2200);
    } catch {
      setCopy("failed");
    }
  }

  return (
    <div className="email-actions">
      <HandArrow shape="contact" className="contact-arrow" />
      <a
        href="#contact"
        className="email-btn"
        onPointerEnter={arm}
        onFocus={arm}
        onTouchStart={arm}
        onClick={arm}
      >
        <svg className="env" viewBox="0 0 24 24" aria-hidden="true">
          <rect x="3" y="7" width="18" height="12" rx="2" />
          <path d="M3.5 7.6 12 13.4l8.5-5.8" />
        </svg>
        <span>Email me</span>
      </a>
      <button
        type="button"
        className={`copy-icon${copy === "copied" ? " is-done" : ""}`}
        onClick={onCopy}
        aria-label="Copy email address"
        title="Copy email address"
      >
        {copy === "copied" ? (
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <path d="M5 12.5l4.5 4.5L19 7.5" />
          </svg>
        ) : (
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <rect x="8.5" y="8.5" width="11.5" height="11.5" rx="2" />
            <path d="M15.5 8.5V6a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v7.5a2 2 0 0 0 2 2h2.5" />
          </svg>
        )}
      </button>
      <span className="copy-tip" aria-live="polite">
        {copy === "copied" ? "Copied" : ""}
      </span>
      {copy === "failed" && (
        <p className="email-reveal">
          Copying isn’t available here. Select the address instead: <span>{address()}</span>
        </p>
      )}
    </div>
  );
}
