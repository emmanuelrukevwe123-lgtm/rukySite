"use client";

import { useEffect } from "react";

/**
 * Draws ```mermaid diagrams in a post. The library is only downloaded on pages that
 * have a diagram, and the diagram is redrawn when the theme changes.
 */
export function Mermaid() {
  useEffect(() => {
    const blocks = Array.from(document.querySelectorAll<HTMLElement>("pre.mermaid"));
    if (!blocks.length) return;
    blocks.forEach((b) => (b.dataset.source ??= b.textContent ?? ""));

    let cancelled = false;
    const draw = async () => {
      const { default: mermaid } = await import("mermaid");
      if (cancelled) return;
      const dark = document.documentElement.dataset.theme === "dark";
      mermaid.initialize({ startOnLoad: false, securityLevel: "strict", theme: dark ? "dark" : "neutral" });
      blocks.forEach((b) => {
        b.removeAttribute("data-processed");
        b.textContent = b.dataset.source ?? "";
      });
      await mermaid.run({ nodes: blocks });
    };

    void draw();
    const observer = new MutationObserver(() => void draw());
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme"] });
    return () => {
      cancelled = true;
      observer.disconnect();
    };
  }, []);

  return null;
}
