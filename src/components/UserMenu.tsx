"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { ChevronDown, LogOut, Settings } from "lucide-react";
import { signOutAction } from "@/app/actions";
import type { Role } from "@/generated/prisma/enums";

const AVATAR_BG: Record<Role, string> = {
  REQUESTER: "bg-zinc-200 text-zinc-600",
  SUPPORT: "bg-blue-100 text-blue-700",
  MANAGER: "bg-violet-100 text-violet-700",
  ADMIN: "bg-amber-100 text-amber-800",
  SUPER: "bg-red-100 text-red-700",
};

function getInitial(name: string | null | undefined, email: string): string {
  return (name ?? email)[0].toUpperCase();
}

export function UserMenu({
  name,
  email,
  role,
}: {
  name: string | null | undefined;
  email: string;
  role: Role;
}) {
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

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setIsOpen((o) => !o)}
        className="flex items-center gap-2 rounded-full py-1 pl-1 pr-2.5 hover:bg-zinc-100 transition-colors"
        aria-haspopup="true"
        aria-expanded={isOpen}
        data-testid="user-menu-trigger"
      >
        <span
          className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-semibold ${AVATAR_BG[role]}`}
        >
          {getInitial(name, email)}
        </span>
        <span className="text-sm text-zinc-700">{name ?? email}</span>
        <ChevronDown
          size={14}
          className={`text-zinc-400 transition-transform duration-150 ${isOpen ? "rotate-180" : ""}`}
        />
      </button>

      {isOpen && (
        <div className="absolute right-0 top-full mt-1.5 w-48 rounded-xl shadow-panel bg-white py-1.5 z-20">
          <div className="px-3 py-2 border-b border-zinc-100 mb-1">
            <p className="text-xs font-medium text-zinc-800 truncate">{name ?? email}</p>
            {name && <p className="text-xs text-zinc-400 truncate">{email}</p>}
          </div>

          <Link
            href="/profile"
            onClick={() => setIsOpen(false)}
            className="flex items-center gap-2.5 px-3 py-2 text-sm text-zinc-700 hover:bg-zinc-50 transition-colors"
          >
            <Settings size={14} className="text-zinc-400" />
            Profile settings
          </Link>

          <div className="my-1 border-t border-zinc-100" />

          <form action={signOutAction}>
            <button
              type="submit"
              className="w-full flex items-center gap-2.5 px-3 py-2 text-sm text-zinc-500 hover:bg-zinc-50 hover:text-zinc-900 transition-colors"
            >
              <LogOut size={14} className="text-zinc-400" />
              Sign out
            </button>
          </form>
        </div>
      )}
    </div>
  );
}
