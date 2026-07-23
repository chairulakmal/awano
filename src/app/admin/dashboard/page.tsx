import { auth } from "@/auth";
import { assertAuthenticated } from "@/lib/auth/assertions";
import { getDashboardMetrics } from "@/lib/admin/service";
import type { TicketStatus } from "@/generated/prisma/enums";

const STATUS_ROWS: { status: TicketStatus; label: string; cls: string }[] = [
  { status: "OPEN", label: "Open", cls: "bg-surface-subtle text-fg-secondary" },
  { status: "IN_PROGRESS", label: "In progress", cls: "bg-blue-50 text-blue-700" },
  {
    status: "WAITING_ON_REQUESTER",
    label: "Waiting on requester",
    cls: "bg-accent-amber-surface text-accent-amber-text",
  },
  { status: "ESCALATED", label: "Escalated", cls: "bg-danger-surface text-danger-text" },
  { status: "RESOLVED", label: "Resolved", cls: "bg-green-50 text-green-700" },
  { status: "CLOSED", label: "Closed", cls: "bg-surface-subtle text-fg-subtle" },
];

export default async function AdminDashboardPage() {
  const session = await auth();
  const payload = assertAuthenticated(session);
  const metrics = await getDashboardMetrics(payload);

  const activeCount =
    metrics.statusCounts.OPEN +
    metrics.statusCounts.IN_PROGRESS +
    metrics.statusCounts.WAITING_ON_REQUESTER +
    metrics.statusCounts.ESCALATED;

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-semibold text-fg-strong">Dashboard</h1>

      {/* Stat cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Active tickets" value={activeCount} />
        <StatCard label="Unassigned" value={metrics.unassignedCount} />
        <StatCard
          label="Avg first response"
          value={metrics.avgResponseHours != null ? `${metrics.avgResponseHours.toFixed(1)}h` : "—"}
        />
        <StatCard
          label="Opened (30d)"
          value={metrics.openedLast30}
          sub={`${metrics.closedLast30} closed`}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Status breakdown */}
        <div className="rounded-xl shadow-card bg-surface px-5 py-5">
          <h2 className="text-xs font-medium text-fg-muted uppercase tracking-wide mb-4">
            Tickets by status
          </h2>
          <table className="w-full text-sm">
            <tbody className="divide-y divide-border-subtle">
              {STATUS_ROWS.map(({ status, label, cls }) => (
                <tr key={status}>
                  <td className="py-2.5">
                    <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${cls}`}>
                      {label}
                    </span>
                  </td>
                  <td className="py-2.5 text-right font-semibold text-fg">
                    {metrics.statusCounts[status]}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Top assignees */}
        <div className="rounded-xl shadow-card bg-surface px-5 py-5">
          <h2 className="text-xs font-medium text-fg-muted uppercase tracking-wide mb-4">
            Top assignees (active tickets)
          </h2>
          {metrics.topAssignees.length === 0 ? (
            <p className="text-sm text-fg-subtle">No assignments yet.</p>
          ) : (
            <ul className="space-y-3">
              {metrics.topAssignees.map(({ user, count }) => (
                <li key={user?.id ?? "unknown"} className="flex items-center justify-between">
                  <span className="text-sm text-fg">
                    {user?.name ?? user?.email ?? "Unknown"}
                  </span>
                  <span className="text-sm font-semibold text-fg-strong">{count}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}

function StatCard({ label, value, sub }: { label: string; value: string | number; sub?: string }) {
  return (
    <div className="rounded-xl shadow-card bg-surface px-5 py-5">
      <p className="text-xs text-fg-subtle mb-1">{label}</p>
      <p className="text-2xl font-bold text-fg-strong">{value}</p>
      {sub && <p className="text-xs text-fg-subtle mt-1">{sub}</p>}
    </div>
  );
}
