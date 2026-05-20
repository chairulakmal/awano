import NextAuth from "next-auth";
import { authConfig } from "@/auth.config";
import type { Role } from "@/generated/prisma/enums";
import { NextResponse } from "next/server";

const { auth } = NextAuth(authConfig);

const DESK_ROLES: Role[] = ["SUPPORT", "MANAGER", "ADMIN"];
const ADMIN_ROLES: Role[] = ["MANAGER", "ADMIN"];

function roleHome(role: Role | undefined): string {
  if (!role) return "/login";
  if (role === "REQUESTER") return "/tickets";
  if (role === "SUPER") return "/super/teams";
  if (ADMIN_ROLES.includes(role)) return "/admin/dashboard";
  return "/desk";
}

export default auth((req) => {
  const { nextUrl } = req;
  const path = nextUrl.pathname;
  const role = req.auth?.user?.role as Role | undefined;
  const isAuthenticated = !!req.auth;

  // Let authenticated users past the login page
  if (path === "/login") {
    if (isAuthenticated) {
      return NextResponse.redirect(new URL(roleHome(role), nextUrl));
    }
    return NextResponse.next();
  }

  // Root — authenticated users go straight to their workspace
  if (path === "/") {
    if (isAuthenticated) {
      return NextResponse.redirect(new URL(roleHome(role), nextUrl));
    }
  }

  // /desk/* — Support, Manager, Admin
  if (path.startsWith("/desk")) {
    if (!isAuthenticated || !role || !DESK_ROLES.includes(role)) {
      return NextResponse.redirect(new URL("/login", nextUrl));
    }
  }

  // /admin/* — Manager, Admin
  if (path.startsWith("/admin")) {
    if (!isAuthenticated || !role || !ADMIN_ROLES.includes(role)) {
      return NextResponse.redirect(new URL("/login", nextUrl));
    }
  }

  // /super/* — Super only
  if (path.startsWith("/super")) {
    if (!isAuthenticated || role !== "SUPER") {
      return NextResponse.redirect(new URL("/login", nextUrl));
    }
  }

  // /tickets/* — Requester only
  if (path.startsWith("/tickets")) {
    if (!isAuthenticated || role !== "REQUESTER") {
      return NextResponse.redirect(new URL("/login", nextUrl));
    }
  }

  return NextResponse.next();
});

export const config = {
  matcher: ["/((?!api/auth|_next/static|_next/image|favicon.ico).*)"],
};
