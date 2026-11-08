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
            onClick={() => setMenuOpen((o) => !o)}
          >
            {menuOpen ? "Close" : "Menu"}
          </button>
        </div>
      </div>
      <nav id="mobile-menu" className="mobile-menu" aria-label="Sections" hidden={!menuOpen}>
        {links}
      </nav>
    </header>
  );
}
