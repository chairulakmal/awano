"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";

const MY_VIEWS = [{ key: "mine", label: "Mine" }];

const TEAM_VIEWS = [
  { key: "unassigned", label: "Unassigned" },
  { key: "open", label: "Open" },
  { key: "escalated", label: "Escalated" },
];

export function DeskSidebar() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const activeView = pathname === "/desk" ? (searchParams.get("view") ?? "unassigned") : null;

  function linkClass(key: string) {
    return `block px-3 py-2 text-sm rounded-lg transition-colors ${
      activeView === key
        ? "bg-primary text-white font-medium"
        : "text-zinc-600 hover:text-zinc-900 hover:bg-zinc-100"
    }`;
  }

  return (
    <aside className="w-44 shrink-0">
      <nav className="space-y-6">
        <div>
          <p className="text-xs font-semibold text-zinc-400 uppercase tracking-wider px-3 mb-1">
            My queue
          </p>
          <ul>
            {MY_VIEWS.map(({ key, label }) => (
              <li key={key}>
                <Link href={`/desk?view=${key}`} className={linkClass(key)}>
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
                <Link href={`/desk?view=${key}`} className={linkClass(key)}>
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
