import { auth } from "@/auth";
import { assertAuthenticated } from "@/lib/auth/assertions";
import { db } from "@/lib/db";
import { NewTicketForm } from "./NewTicketForm";

export default async function NewTicketPage() {
  const session = await auth();
  const payload = assertAuthenticated(session);

  const categories = await db.category.findMany({
    where: { teamId: payload.teamId! },
    orderBy: { name: "asc" },
    select: { id: true, name: true },
  });

  return (
    <div className="max-w-xl">
      <div className="mb-8">
        <h1 className="text-2xl font-semibold text-fg-strong">New ticket</h1>
        <p className="text-sm text-fg-muted mt-1">
          Describe your request and we&apos;ll get back to you.
        </p>
      </div>
      <div className="rounded-xl shadow-panel bg-surface p-6">
        <NewTicketForm categories={categories} />
      </div>
    </div>
  );
}
