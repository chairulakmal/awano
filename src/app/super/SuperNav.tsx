"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const LINKS = [{ href: "/super/teams", label: "Teams" }];

export function SuperNav() {
  const pathname = usePathname();
  return (
    <nav className="flex gap-1 mb-8">
      {LINKS.map(({ href, label }) => (
        <Link
          key={href}
          href={href}
          className={`px-3 py-1.5 text-sm font-medium rounded-lg transition-colors ${
            pathname.startsWith(href)
              ? "bg-zinc-900 text-white"
              : "text-zinc-500 hover:text-zinc-800 hover:bg-zinc-100"
          }`}
        >
          {label}
        </Link>
      ))}
    </nav>
  );
}
