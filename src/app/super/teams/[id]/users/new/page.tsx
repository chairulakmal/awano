import Link from "next/link";
import { notFound } from "next/navigation";
import { auth } from "@/auth";
import { assertAuthenticated } from "@/lib/auth/assertions";
import { getTeamDetail } from "@/lib/teams/service";
import { NewUserForm } from "./NewUserForm";

type Props = { params: Promise<{ id: string }> };

export default async function SuperNewUserPage({ params }: Props) {
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
        <Link href={`/super/teams/${id}`} className="hover:text-zinc-800 transition-colors">
          {team.name}
        </Link>
        <span>→</span>
        <span className="text-zinc-800">New user</span>
      </div>

      <h1 className="text-xl font-semibold text-zinc-900">Add user to {team.name}</h1>

      <div className="rounded-xl shadow-card bg-white px-5 py-6 max-w-lg">
        <NewUserForm teamId={id} />
      </div>
    </div>
  );
}
