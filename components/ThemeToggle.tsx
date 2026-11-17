"use client";

import { useEffect, useSyncExternalStore } from "react";
import { THEME_STORAGE_KEY, type Theme } from "@/lib/theme";
import { useReducedMotion } from "@/lib/useMediaQuery";

function subscribe(onChange: () => void) {
  const observer = new MutationObserver(onChange);
  observer.observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme"] });
  return () => observer.disconnect();
}

const currentTheme = (): Theme => (document.documentElement.dataset.theme === "dark" ? "dark" : "light");

function savedTheme(): Theme | null {
  try {
    const t = localStorage.getItem(THEME_STORAGE_KEY);
    return t === "light" || t === "dark" ? t : null;
  } catch {
    return null;
  }
}

export function ThemeToggle() {
  // null while prerendering; the real theme is only known in the browser.
  const theme = useSyncExternalStore<Theme | null>(subscribe, currentTheme, () => null);
  const reducedMotion = useReducedMotion();

  // Follow the system setting until the visitor makes a choice.
  useEffect(() => {
    const mql = window.matchMedia("(prefers-color-scheme: dark)");
    const onChange = () => {
      if (!savedTheme()) document.documentElement.dataset.theme = mql.matches ? "dark" : "light";
    };
    mql.addEventListener("change", onChange);
    return () => mql.removeEventListener("change", onChange);
  }, []);

  function onClick(e: React.MouseEvent<HTMLButtonElement>) {
    const next: Theme = currentTheme() === "dark" ? "light" : "dark";
    const apply = () => {
      document.documentElement.dataset.theme = next;
      try {
        localStorage.setItem(THEME_STORAGE_KEY, next);
      } catch {
        /* private mode: the choice just won't persist */
      }
    };

    if (reducedMotion || typeof document.startViewTransition !== "function") {
      apply();
      return;
    }

    // The new theme spreads out from the button in a circle.
    const rect = e.currentTarget.getBoundingClientRect();
    const x = rect.left + rect.width / 2;
    const y = rect.top + rect.height / 2;
    const radius = Math.hypot(Math.max(x, window.innerWidth - x), Math.max(y, window.innerHeight - y));
    const transition = document.startViewTransition(apply);
    transition.ready
      .then(() => {
        document.documentElement.animate(
          { clipPath: [`circle(0px at ${x}px ${y}px)`, `circle(${radius}px at ${x}px ${y}px)`] },
          { duration: 700, easing: "cubic-bezier(.22,.8,.26,1)", pseudoElement: "::view-transition-new(root)" },
        );
      })
      .catch(() => {});
  }

  return (
    <button
      type="button"
      className="theme-toggle"
      onClick={onClick}
      aria-label="Dark mode"
      aria-pressed={theme === null ? undefined : theme === "dark"}
      title={theme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
    >
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path d="m16 12c2.205 0 4 1.795 4 4s-1.795 4-4 4-4-1.795-4-4 1.795-4 4-4zm-7.984-5.938.568-.314c-.053-.241-.085-.49-.085-.747s.032-.506.085-.747l-.568-.314c-.483-.267-.659-.876-.391-1.359s.876-.658 1.359-.391l.57.315c.4-.392.897-.675 1.446-.841v-.663c0-.552.448-1 1-1s1 .448 1 1v.663c.549.165 1.047.449 1.446.841l.57-.315c.484-.267 1.092-.092 1.359.391.268.483.092 1.092-.391 1.359l-.568.314c.053.241.085.49.085.747s-.032.506-.085.747l.568.314c.483.267.659.876.391 1.359-.269.488-.885.656-1.359.391l-.57-.315c-.4.392-.897.675-1.446.841v.663c0 .552-.448 1-1 1s-1-.448-1-1v-.663c-.549-.165-1.047-.449-1.446-.841l-.57.315c-.474.265-1.09.097-1.359-.391-.268-.483-.092-1.092.391-1.359zm2.484-1.062c0 .827.673 1.5 1.5 1.5s1.5-.673 1.5-1.5-.673-1.5-1.5-1.5-1.5.673-1.5 1.5zm8.357 3.525c-.515-.197-1.094.061-1.292.577-.197.516.061 1.094.577 1.292 2.307.883 3.857 3.136 3.857 5.606 0 3.309-2.691 6-6 6h-7.999c-3.309 0-6-2.691-6-6 0-2.471 1.55-4.724 3.857-5.606.516-.197.774-.775.577-1.292-.198-.516-.777-.774-1.292-.577-3.075 1.178-5.142 4.181-5.142 7.475 0 4.411 3.589 8 8 8h8c4.411 0 8-3.589 8-8 0-3.294-2.067-6.297-5.143-7.475z" />
      </svg>
    </button>
  );
}
