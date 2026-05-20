import Link from "next/link";
import { notFound } from "next/navigation";
import { auth } from "@/auth";
import { assertAuthenticated } from "@/lib/auth/assertions";
import { getTeamDetail } from "@/lib/teams/service";
import { SeedDemoButton } from "./SeedDemoButton";
import type { Role, RequesterType } from "@/generated/prisma/enums";

const ROLE_LABEL: Record<Role, string> = {
  REQUESTER: "Requester",
  SUPPORT:   "Support",
  MANAGER:   "Manager",
  ADMIN:     "Admin",
  SUPER:     "Super",
};

const ROLE_CLASS: Record<Role, string> = {
  REQUESTER: "bg-zinc-100 text-zinc-500",
  SUPPORT:   "bg-blue-50 text-blue-700",
  MANAGER:   "bg-violet-50 text-violet-700",
  ADMIN:     "bg-amber-50 text-amber-700",
  SUPER:     "bg-red-50 text-red-700",
};

const REQUESTER_TYPE_LABEL: Record<RequesterType, string> = {
  CUSTOMER:    "Customer",
  RECRUITER:   "Recruiter",
  FIELD_AGENT: "Field agent",
};

type Props = { params: Promise<{ id: string }> };

export default async function SuperTeamDetailPage({ params }: Props) {
  const { id } = await params;

  const session = await auth();
  const payload = assertAuthenticated(session);

  let team: Awaited<ReturnType<typeof getTeamDetail>>;
  try {
    team = await getTeamDetail(id, payload);
  } catch {
    notFound();
  }

  return (
    <div className="space-y-6">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm text-zinc-500">
        <Link href="/super/teams" className="hover:text-zinc-800 transition-colors">
          Teams
        </Link>
        <span>→</span>
        <span className="text-zinc-800">{team.name}</span>
      </div>

      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold text-zinc-900">{team.name}</h1>
          <p className="text-sm text-zinc-400 font-mono mt-0.5">{team.slug}</p>
          {team.notes && <p className="text-sm text-zinc-600 mt-2">{team.notes}</p>}
        </div>
        <div className="flex items-start gap-2">
          <SeedDemoButton teamId={id} />
          <Link
            href={`/super/teams/${id}/users/new`}
            className="px-4 py-2 bg-primary text-white text-sm font-semibold rounded-lg hover:bg-primary-hover transition-colors shadow-sm"
          >
            + Add user
          </Link>
        </div>
      </div>

      {/* Users table */}
      <div className="rounded-xl shadow-card bg-white overflow-hidden">
        <div className="px-5 py-4 border-b border-zinc-100">
          <h2 className="text-xs font-medium text-zinc-500 uppercase tracking-wide">
            Users ({team.users.length})
          </h2>
        </div>
        {team.users.length === 0 ? (
          <p className="px-5 py-8 text-sm text-zinc-400 text-center">No users yet.</p>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-zinc-100">
                <th className="text-left px-5 py-3 text-xs font-medium text-zinc-400 uppercase tracking-wide">Name</th>
                <th className="text-left px-5 py-3 text-xs font-medium text-zinc-400 uppercase tracking-wide">Email</th>
                <th className="text-left px-5 py-3 text-xs font-medium text-zinc-400 uppercase tracking-wide">Role</th>
                <th className="text-left px-5 py-3 text-xs font-medium text-zinc-400 uppercase tracking-wide">Joined</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-50">
              {team.users.map((user) => (
                <tr key={user.id} className="hover:bg-zinc-50 transition-colors">
                  <td className="px-5 py-3 font-medium text-zinc-800">
                    {user.name ?? <span className="text-zinc-400 italic">—</span>}
                  </td>
                  <td className="px-5 py-3 text-zinc-500">{user.email}</td>
                  <td className="px-5 py-3">
                    <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${ROLE_CLASS[user.role]}`}>
                      {ROLE_LABEL[user.role]}
                    </span>
                    {user.requesterType && (
                      <span className="ml-1.5 text-xs text-zinc-400">
                        {REQUESTER_TYPE_LABEL[user.requesterType]}
                      </span>
                    )}
                  </td>
                  <td className="px-5 py-3 text-zinc-400 text-xs">
                    {new Date(user.createdAt).toLocaleDateString()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
