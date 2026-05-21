import { auth } from "@/auth";
import { assertAuthenticated } from "@/lib/auth/assertions";
import { listTeamUsers } from "@/lib/users/service";
import { ChangeRoleForm } from "./ChangeRoleForm";
import type { Role, RequesterType } from "@/generated/prisma/enums";

const ROLE_LABEL: Record<Role, string> = {
  REQUESTER: "Requester",
  SUPPORT: "Support",
  MANAGER: "Manager",
  ADMIN: "Admin",
  SUPER: "Super",
};

const ROLE_CLASS: Record<Role, string> = {
  REQUESTER: "bg-zinc-100 text-zinc-500",
  SUPPORT: "bg-blue-50 text-blue-700",
  MANAGER: "bg-violet-50 text-violet-700",
  ADMIN: "bg-amber-50 text-amber-700",
  SUPER: "bg-red-50 text-red-700",
};

const REQUESTER_TYPE_LABEL: Record<RequesterType, string> = {
  CUSTOMER: "Customer",
  RECRUITER: "Recruiter",
  FIELD_AGENT: "Field agent",
};

export default async function AdminUsersPage() {
  const session = await auth();
  const payload = assertAuthenticated(session);
  const users = await listTeamUsers(payload);

  return (
    <div>
      <h1 className="text-xl font-semibold text-zinc-900 mb-6">Users</h1>

      <div className="rounded-xl shadow-card bg-white overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-zinc-100">
              <th className="text-left px-5 py-3 text-xs font-medium text-zinc-400 uppercase tracking-wide">
                Name
              </th>
              <th className="text-left px-5 py-3 text-xs font-medium text-zinc-400 uppercase tracking-wide">
                Email
              </th>
              <th className="text-left px-5 py-3 text-xs font-medium text-zinc-400 uppercase tracking-wide">
                Type
              </th>
              <th className="text-left px-5 py-3 text-xs font-medium text-zinc-400 uppercase tracking-wide">
                Joined
              </th>
              <th className="text-left px-5 py-3 text-xs font-medium text-zinc-400 uppercase tracking-wide">
                Role
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-50">
            {users.map((user) => (
              <tr key={user.id} className="hover:bg-zinc-50 transition-colors">
                <td className="px-5 py-3 font-medium text-zinc-800">
                  {user.name ?? <span className="text-zinc-400 italic">—</span>}
                </td>
                <td className="px-5 py-3 text-zinc-500">{user.email}</td>
                <td className="px-5 py-3">
                  <span
                    className={`text-xs font-medium px-2 py-0.5 rounded-full ${ROLE_CLASS[user.role]}`}
                  >
                    {ROLE_LABEL[user.role]}
                  </span>
                  {user.requesterType && (
                    <span className="ml-1.5 text-xs text-zinc-400">
                      {REQUESTER_TYPE_LABEL[user.requesterType]}
                    </span>
                  )}
                </td>
                <td className="px-5 py-3 text-zinc-400">
                  {new Date(user.createdAt).toLocaleDateString()}
                </td>
                <td className="px-5 py-3">
                  <ChangeRoleForm
                    userId={user.id}
                    currentRole={user.role}
                    currentRequesterType={user.requesterType}
                    isSelf={user.id === payload.userId}
                    sessionRole={payload.role}
                  />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
