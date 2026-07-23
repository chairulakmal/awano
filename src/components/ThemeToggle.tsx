"use client";

import { useSyncExternalStore } from "react";
import { Moon, Sun } from "lucide-react";

type Theme = "light" | "dark";

const THEME_EVENT = "awano:themechange";

/*
 * The effective theme is external state (the <html data-theme> the server set
 * from the cookie, or the OS preference when unset), so it is read through
 * useSyncExternalStore rather than mirrored into React state. `subscribe`
 * listens for OS-preference changes and for our own toggle event; the server
 * snapshot is null so the button renders an empty same-size box until mounted,
 * avoiding a hydration mismatch and an icon flip.
 */
function subscribe(onChange: () => void): () => void {
  const media = window.matchMedia("(prefers-color-scheme: dark)");
  media.addEventListener("change", onChange);
  window.addEventListener(THEME_EVENT, onChange);
  return () => {
    media.removeEventListener("change", onChange);
    window.removeEventListener(THEME_EVENT, onChange);
  };
}

function readTheme(): Theme {
  const attr = document.documentElement.dataset.theme;
  if (attr === "light" || attr === "dark") return attr;
  return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

export function ThemeToggle() {
  const theme = useSyncExternalStore(subscribe, readTheme, () => null);

  function toggle() {
    const next: Theme = theme === "dark" ? "light" : "dark";
    document.documentElement.dataset.theme = next;
    document.cookie = `theme=${next};path=/;max-age=31536000;samesite=lax`;
    window.dispatchEvent(new Event(THEME_EVENT));
  }

  return (
    <button
      type="button"
      onClick={toggle}
      aria-label={
        theme ? `Switch to ${theme === "dark" ? "light" : "dark"} theme` : "Toggle theme"
      }
      className="flex items-center justify-center w-8 h-8 rounded-lg text-fg-secondary hover:bg-surface-subtle transition-colors"
    >
      {theme === null ? null : theme === "dark" ? <Sun size={18} /> : <Moon size={18} />}
    </button>
  );
}
