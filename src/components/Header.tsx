import Link from "next/link";
import { auth } from "@/auth";
import { UserMenu } from "./UserMenu";
import { NavMenu } from "./NavMenu";
import { ThemeToggle } from "./ThemeToggle";
import type { Role } from "@/generated/prisma/enums";

type NavLink = { href: string; label: string };

function navLinksForRole(role: Role): NavLink[] {
  switch (role) {
    case "REQUESTER":
      return [{ href: "/tickets", label: "My Tickets" }];
    case "SUPPORT":
      return [{ href: "/desk", label: "Queue" }];
    case "MANAGER":
      return [
        { href: "/admin/dashboard", label: "Dashboard" },
        { href: "/admin/tickets", label: "All Tickets" },
        { href: "/desk", label: "Queue" },
      ];
    case "ADMIN":
      return [{ href: "/admin/dashboard", label: "Dashboard" }];
    case "SUPER":
      return [{ href: "/super/teams", label: "Teams" }];
  }
}

export async function Header() {
  const session = await auth();
  const user = session?.user;
  const navLinks = user ? navLinksForRole(user.role) : [];

  return (
    <nav className="sticky top-0 z-10 flex items-center justify-between px-8 py-4 bg-surface-muted/95 backdrop-blur-sm shadow-sm">
      <div className="flex items-center gap-6">
        <Link
          href="/"
          className="group inline-flex items-center gap-2 text-fg-strong transition-colors"
          aria-label="Awano home"
        >
          <span
            className="seal grid place-items-center w-6 h-6 text-[13px] font-medium select-none -rotate-6 group-hover:rotate-0 transition-transform"
            aria-hidden="true"
          >
            淡
          </span>
          <span className="font-display text-base font-semibold tracking-tight group-hover:text-primary transition-colors">
            Awano
          </span>
        </Link>
        <NavMenu links={navLinks} />
      </div>

      <div className="flex items-center gap-2">
        <ThemeToggle />
        {user ? (
          <UserMenu name={user.name} email={user.email!} role={user.role} />
        ) : (
          <Link
            href="/login?team=demo"
            className="ml-1 text-sm font-medium text-primary hover:text-primary-hover transition-colors"
          >
            Sign in →
          </Link>
        )}
      </div>
    </nav>
  );
}
