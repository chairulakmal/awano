"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Menu } from "lucide-react";

type NavLink = { href: string; label: string };

export function NavMenu({ links }: { links: NavLink[] }) {
  const [isOpen, setIsOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isOpen) return;
    function handler(e: MouseEvent | KeyboardEvent) {
      if (e instanceof KeyboardEvent) {
        if (e.key === "Escape") setIsOpen(false);
        return;
      }
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handler);
    document.addEventListener("keydown", handler);
    return () => {
      document.removeEventListener("mousedown", handler);
      document.removeEventListener("keydown", handler);
    };
  }, [isOpen]);

  if (links.length === 0) return null;

  return (
    <>
      {/* Inline links — hidden on small screens */}
      <div className="hidden sm:flex items-center gap-6">
        {links.map(({ href, label }) => (
          <Link
            key={href}
            href={href}
            className="text-sm font-medium text-fg-muted hover:text-fg-strong transition-colors"
          >
            {label}
          </Link>
        ))}
      </div>

      {/* Hamburger dropdown — visible only on small screens */}
      <div ref={ref} className="relative sm:hidden">
        <button
          onClick={() => setIsOpen((o) => !o)}
          className="flex items-center justify-center w-8 h-8 rounded-lg hover:bg-surface-subtle transition-colors"
          aria-haspopup="true"
          aria-expanded={isOpen}
          aria-label="Navigation menu"
        >
          <Menu size={18} className="text-fg-secondary" />
        </button>

        {isOpen && (
          <div className="absolute left-0 top-full mt-1.5 w-44 rounded-xl shadow-panel bg-surface py-1.5 z-20">
            {links.map(({ href, label }) => (
              <Link
                key={href}
                href={href}
                onClick={() => setIsOpen(false)}
                className="flex items-center px-3 py-2 text-sm text-fg hover:bg-surface-muted transition-colors"
              >
                {label}
              </Link>
            ))}
          </div>
        )}
      </div>
    </>
  );
}
