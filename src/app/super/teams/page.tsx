import Link from "next/link";
import { auth } from "@/auth";
import { assertAuthenticated } from "@/lib/auth/assertions";
import { listTeams } from "@/lib/teams/service";
import { NewTeamForm } from "./NewTeamForm";

export default async function SuperTeamsPage() {
  const session = await auth();
  const payload = assertAuthenticated(session);
  const teams = await listTeams(payload);

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-semibold text-zinc-900">Teams</h1>

      <div className="rounded-xl shadow-card bg-white overflow-hidden">
        {teams.length === 0 ? (
          <p className="px-5 py-8 text-sm text-zinc-400 text-center">No teams yet.</p>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-zinc-100">
                <th className="text-left px-5 py-3 text-xs font-medium text-zinc-400 uppercase tracking-wide">Name</th>
                <th className="text-left px-5 py-3 text-xs font-medium text-zinc-400 uppercase tracking-wide">Slug</th>
                <th className="text-right px-5 py-3 text-xs font-medium text-zinc-400 uppercase tracking-wide">Users</th>
                <th className="text-right px-5 py-3 text-xs font-medium text-zinc-400 uppercase tracking-wide">Tickets</th>
                <th className="px-5 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-50">
              {teams.map((team) => (
                <tr key={team.id} className="hover:bg-zinc-50 transition-colors">
                  <td className="px-5 py-3 font-medium text-zinc-800">{team.name}</td>
                  <td className="px-5 py-3 text-zinc-400 font-mono text-xs">{team.slug}</td>
                  <td className="px-5 py-3 text-right text-zinc-500">{team._count.users}</td>
                  <td className="px-5 py-3 text-right text-zinc-500">{team._count.tickets}</td>
                  <td className="px-5 py-3 text-right">
                    <Link
                      href={`/super/teams/${team.id}`}
                      className="text-xs text-zinc-500 hover:text-zinc-800 transition-colors"
                    >
                      View →
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <div className="rounded-xl shadow-card bg-white px-5 py-5">
        <h2 className="text-xs font-medium text-zinc-500 uppercase tracking-wide mb-4">New team</h2>
        <NewTeamForm />
      </div>
    </div>
  );
}
