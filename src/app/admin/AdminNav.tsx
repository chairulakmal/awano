"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const LINKS = [
  { href: "/admin/dashboard", label: "Dashboard" },
  { href: "/admin/tickets", label: "All Tickets" },
  { href: "/admin/users", label: "Users" },
  { href: "/admin/categories", label: "Categories" },
  { href: "/desk", label: "Queue" },
];

export function AdminNav() {
  const pathname = usePathname();
  return (
    <nav className="flex gap-1 mb-8 overflow-x-auto pb-1">
      {LINKS.map(({ href, label }) => (
        <Link
          key={href}
          href={href}
          className={`shrink-0 whitespace-nowrap px-3 py-1.5 text-sm font-medium rounded-lg transition-colors ${
            pathname.startsWith(href)
              ? "bg-surface-inverse text-fg-on-inverse"
              : "text-fg-muted hover:text-fg-strong hover:bg-surface-subtle"
          }`}
        >
          {label}
        </Link>
      ))}
    </nav>
  );
}
