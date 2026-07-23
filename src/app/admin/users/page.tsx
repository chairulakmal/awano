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
  REQUESTER: "bg-surface-subtle text-fg-muted",
  SUPPORT: "bg-blue-50 text-blue-700",
  MANAGER: "bg-violet-50 text-violet-700",
  ADMIN: "bg-accent-amber-surface text-accent-amber-text",
  SUPER: "bg-danger-surface text-danger-text",
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
      <h1 className="font-display text-xl font-semibold text-fg-strong mb-6">Users</h1>

      <div className="rounded-xl shadow-card bg-surface overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border-subtle">
              <th className="text-left px-5 py-3 text-xs font-medium text-fg-subtle uppercase tracking-wide">
                Name
              </th>
              <th className="text-left px-5 py-3 text-xs font-medium text-fg-subtle uppercase tracking-wide">
                Email
              </th>
              <th className="text-left px-5 py-3 text-xs font-medium text-fg-subtle uppercase tracking-wide">
                Type
              </th>
              <th className="text-left px-5 py-3 text-xs font-medium text-fg-subtle uppercase tracking-wide">
                Joined
              </th>
              <th className="text-left px-5 py-3 text-xs font-medium text-fg-subtle uppercase tracking-wide">
                Role
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border-subtle">
            {users.map((user) => (
              <tr key={user.id} className="hover:bg-surface-muted transition-colors">
                <td className="px-5 py-3 font-medium text-fg-strong">
                  {user.name ?? <span className="text-fg-subtle italic">—</span>}
                </td>
                <td className="px-5 py-3 text-fg-muted">{user.email}</td>
                <td className="px-5 py-3">
                  <span
                    className={`text-xs font-medium px-2 py-0.5 rounded-full ${ROLE_CLASS[user.role]}`}
                  >
                    {ROLE_LABEL[user.role]}
                  </span>
                  {user.requesterType && (
                    <span className="ml-1.5 text-xs text-fg-subtle">
                      {REQUESTER_TYPE_LABEL[user.requesterType]}
                    </span>
                  )}
                </td>
                <td className="px-5 py-3 text-fg-subtle">
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
