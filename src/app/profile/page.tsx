import { auth } from "@/auth";
import { assertAuthenticated } from "@/lib/auth/assertions";
import { db } from "@/lib/db";
import { Header } from "@/components/Header";
import { ChangePasswordModal } from "./ChangePasswordModal";
import type { Role } from "@/generated/prisma/enums";

const ROLE_LABEL: Record<Role, string> = {
  REQUESTER: "Requester",
  SUPPORT: "Support",
  MANAGER: "Manager",
  ADMIN: "Admin",
  SUPER: "Super",
};

const ROLE_BADGE: Record<Role, string> = {
  REQUESTER: "bg-zinc-100 text-zinc-500",
  SUPPORT: "bg-blue-50 text-blue-700",
  MANAGER: "bg-violet-50 text-violet-700",
  ADMIN: "bg-amber-50 text-amber-800",
  SUPER: "bg-red-50 text-red-700",
};

const AVATAR_BG: Record<Role, string> = {
  REQUESTER: "bg-zinc-200 text-zinc-600",
  SUPPORT: "bg-blue-100 text-blue-700",
  MANAGER: "bg-violet-100 text-violet-700",
  ADMIN: "bg-amber-100 text-amber-800",
  SUPER: "bg-red-100 text-red-700",
};

function getInitials(name: string | null | undefined, email: string): string {
  if (name) {
    const parts = name.trim().split(/\s+/);
    if (parts.length >= 2) return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
    return parts[0].slice(0, 2).toUpperCase();
  }
  return email[0].toUpperCase();
}

export default async function ProfilePage() {
  const session = await auth();
  const payload = assertAuthenticated(session);
  const user = await db.user.findUnique({
    where: { id: payload.userId },
    select: { name: true, email: true, role: true },
  });

  if (!user) return null;

  const initials = getInitials(user.name, user.email);

  return (
    <div className="min-h-screen bg-zinc-50">
      <Header />
      <main className="max-w-lg mx-auto px-6 py-10">

        {/* Avatar + identity header */}
        <div className="flex items-center gap-4 mb-8">
          <div
            className={`w-16 h-16 rounded-full flex items-center justify-center text-xl font-semibold flex-shrink-0 ${AVATAR_BG[user.role]}`}
          >
            {initials}
          </div>
          <div className="min-w-0">
            <h1 className="text-xl font-semibold text-zinc-900 truncate">
              {user.name ?? user.email}
            </h1>
            {user.name && (
              <p className="text-sm text-zinc-400 truncate">{user.email}</p>
            )}
            <span
              className={`mt-1 inline-block text-xs font-medium px-2 py-0.5 rounded-full ${ROLE_BADGE[user.role]}`}
            >
              {ROLE_LABEL[user.role]}
            </span>
          </div>
        </div>

        {/* Account card */}
        <div className="rounded-xl shadow-card bg-white p-6 mb-4">
          <h2 className="text-xs font-medium text-zinc-400 uppercase tracking-wide mb-4">
            Account
          </h2>
          <dl className="divide-y divide-zinc-50 text-sm">
            <div className="flex justify-between py-2.5 first:pt-0 last:pb-0">
              <dt className="text-zinc-500">Name</dt>
              <dd className="font-medium text-zinc-800">{user.name ?? <span className="text-zinc-400 italic">—</span>}</dd>
            </div>
            <div className="flex justify-between py-2.5 first:pt-0 last:pb-0">
              <dt className="text-zinc-500">Email</dt>
              <dd className="font-medium text-zinc-800">{user.email}</dd>
            </div>
            <div className="flex justify-between py-2.5 first:pt-0 last:pb-0">
              <dt className="text-zinc-500">Role</dt>
              <dd className="font-medium text-zinc-800">{ROLE_LABEL[user.role]}</dd>
            </div>
          </dl>
          <p className="mt-4 text-xs text-zinc-400">
            To update your name, email, or role, contact your team admin.
          </p>
        </div>

        {/* Security card */}
        <div className="rounded-xl shadow-card bg-white p-6">
          <h2 className="text-xs font-medium text-zinc-400 uppercase tracking-wide mb-4">
            Security
          </h2>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-zinc-800">Password</p>
              <p className="text-xs text-zinc-400 mt-0.5">Update your login password</p>
            </div>
            <ChangePasswordModal />
          </div>
        </div>

      </main>
    </div>
  );
}
