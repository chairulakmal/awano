"use client";

import { useRef } from "react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

const MY_VIEWS = [{ key: "mine", label: "Mine" }];

const TEAM_VIEWS = [
  { key: "unassigned", label: "Unassigned" },
  { key: "open", label: "Open" },
  { key: "escalated", label: "Escalated" },
];

export function DeskSidebar() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const router = useRouter();
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const activeView = pathname === "/desk" ? (searchParams.get("view") ?? "unassigned") : null;
  const currentQ = searchParams.get("q") ?? "";

  function handleSearch(e: React.ChangeEvent<HTMLInputElement>) {
    const q = e.target.value;
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => {
      const params = new URLSearchParams();
      if (activeView) params.set("view", activeView);
      if (q) params.set("q", q);
      router.push(`/desk?${params.toString()}`);
    }, 300);
  }

  function viewHref(key: string) {
    const params = new URLSearchParams();
    params.set("view", key);
    if (currentQ) params.set("q", currentQ);
    return `/desk?${params.toString()}`;
  }

  function linkClass(key: string) {
    return `block px-3 py-2 text-sm rounded-lg transition-colors ${
      activeView === key
        ? "bg-primary text-white font-medium"
        : "text-zinc-600 hover:text-zinc-900 hover:bg-zinc-100"
    }`;
  }

  return (
    <aside className="w-44 shrink-0">
      <div className="mb-5">
        {/* key resets the uncontrolled input when the committed URL query changes */}
        <input
          key={currentQ}
          type="search"
          defaultValue={currentQ}
          onChange={handleSearch}
          placeholder="Search tickets…"
          className="w-full px-3 py-1.5 text-sm rounded-lg border border-zinc-200 bg-white placeholder-zinc-400 focus:outline-none focus:ring-2 focus:ring-primary/40"
        />
      </div>
      <nav className="space-y-6">
        <div>
          <p className="text-xs font-semibold text-zinc-400 uppercase tracking-wider px-3 mb-1">
            My queue
          </p>
          <ul>
            {MY_VIEWS.map(({ key, label }) => (
              <li key={key}>
                <Link href={viewHref(key)} className={linkClass(key)}>
                  {label}
                </Link>
              </li>
            ))}
          </ul>
        </div>
        <div>
          <p className="text-xs font-semibold text-zinc-400 uppercase tracking-wider px-3 mb-1">
            Team queue
          </p>
          <ul>
            {TEAM_VIEWS.map(({ key, label }) => (
              <li key={key}>
                <Link href={viewHref(key)} className={linkClass(key)}>
                  {label}
                </Link>
              </li>
            ))}
          </ul>
        </div>
      </nav>
    </aside>
  );
}
