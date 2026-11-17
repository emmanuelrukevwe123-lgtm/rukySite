"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { navLinks, site } from "@/lib/content";
import { ThemeToggle } from "./ThemeToggle";

export function Nav() {
  const [active, setActive] = useState<string | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const headerRef = useRef<HTMLElement>(null);
  const onBlog = usePathname().startsWith("/blog");

  // Mark the section currently in the middle of the screen.
  useEffect(() => {
    if (!("IntersectionObserver" in window)) return;
    const ids = ["top", ...navLinks.map((l) => l.section)];
    const io = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) setActive(entry.target.id === "top" ? null : entry.target.id);
        }
      },
      { rootMargin: "-45% 0px -50% 0px" },
    );
    ids.forEach((id) => {
      const el = document.getElementById(id);
      if (el) io.observe(el);
    });
    return () => io.disconnect();
  }, []);

  // Close the phone menu on Escape or a tap outside it.
  useEffect(() => {
    if (!menuOpen) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setMenuOpen(false);
    const onPointer = (e: PointerEvent) => {
      if (headerRef.current && !headerRef.current.contains(e.target as Node)) setMenuOpen(false);
    };
    document.addEventListener("keydown", onKey);
    document.addEventListener("pointerdown", onPointer);
    return () => {
      document.removeEventListener("keydown", onKey);
      document.removeEventListener("pointerdown", onPointer);
    };
  }, [menuOpen]);

  const links = navLinks.map((l) => (
    <Link
      key={l.section}
      href={l.href}
      aria-current={(onBlog ? l.section === "journal" : active === l.section) ? "true" : undefined}
      onClick={() => setMenuOpen(false)}
    >
      {l.label}
    </Link>
  ));

  return (
    <header className="nav" ref={headerRef}>
      <div className="nav-inner">
        <Link href="/" className="brand">
          <span className="brand-dot" aria-hidden="true" />
          {site.name}
        </Link>
        <div className="nav-right">
          <nav className="nav-links" aria-label="Sections">
            {links}
          </nav>
          <ThemeToggle />
          <button
            type="button"
            className="menu-btn"
            aria-expanded={menuOpen}
            aria-controls="mobile-menu"
            aria-label={menuOpen ? "Close menu" : "Menu"}
            title={menuOpen ? "Close menu" : "Menu"}
            onClick={() => setMenuOpen((o) => !o)}
          >
            {/* Filled, rounded bars to match the other icons (Flaticon UIcons style). */}
            <svg viewBox="0 0 24 24" aria-hidden="true">
              {menuOpen ? (
                <path d="M18.71 5.29a1 1 0 0 0-1.42 0L12 10.59 6.71 5.29a1 1 0 0 0-1.42 1.42L10.59 12l-5.3 5.29a1 1 0 1 0 1.42 1.42L12 13.41l5.29 5.3a1 1 0 0 0 1.42-1.42L13.41 12l5.3-5.29a1 1 0 0 0 0-1.42Z" />
              ) : (
                <path d="M3 5h18a1 1 0 0 1 0 2H3a1 1 0 0 1 0-2Zm0 6h18a1 1 0 0 1 0 2H3a1 1 0 0 1 0-2Zm0 6h12a1 1 0 0 1 0 2H3a1 1 0 0 1 0-2Z" />
              )}
            </svg>
          </button>
        </div>
      </div>
      <nav id="mobile-menu" className="mobile-menu" aria-label="Sections" hidden={!menuOpen}>
        {links}
      </nav>
    </header>
  );
}
