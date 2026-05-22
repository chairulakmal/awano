import Link from "next/link";
import { auth } from "@/auth";
import { UserMenu } from "./UserMenu";
import { NavMenu } from "./NavMenu";
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
    <nav className="sticky top-0 z-10 flex items-center justify-between px-8 py-4 bg-zinc-50/95 backdrop-blur-sm shadow-sm">
      <div className="flex items-center gap-6">
        <Link
          href="/"
          className="text-base font-semibold tracking-tight text-zinc-900 hover:text-primary transition-colors"
        >
          Awano
        </Link>
        <NavMenu links={navLinks} />
      </div>

      {user ? (
        <UserMenu name={user.name} email={user.email!} role={user.role} />
      ) : (
        <Link
          href="/login?team=demo"
          className="text-sm font-medium text-primary hover:text-primary-hover transition-colors"
        >
          Sign in →
        </Link>
      )}
    </nav>
  );
}
