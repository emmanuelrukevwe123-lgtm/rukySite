export type Theme = "light" | "dark";

export const THEME_STORAGE_KEY = "theme";

/**
 * Runs in <head> before the page paints, so there is no flash of the wrong theme.
 * Uses the visitor's saved choice, otherwise their system setting.
 * Also marks the document as JS-enabled (used by the collage's no-JS fallback).
 */
export const themeInitScript = `(function(){var d=document.documentElement;d.classList.add("js");var t;try{t=localStorage.getItem("${THEME_STORAGE_KEY}")}catch(e){}if(t!=="light"&&t!=="dark"){t=window.matchMedia("(prefers-color-scheme: dark)").matches?"dark":"light"}d.dataset.theme=t})();`;
