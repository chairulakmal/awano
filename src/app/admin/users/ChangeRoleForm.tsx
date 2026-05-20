"use client";

import { useActionState } from "react";
import { changeRoleAction } from "./actions";
import type { Role } from "@/generated/prisma/enums";

const ROLES: { value: Role; label: string }[] = [
  { value: "REQUESTER", label: "Requester" },
  { value: "SUPPORT", label: "Support" },
  { value: "MANAGER", label: "Manager" },
  { value: "ADMIN", label: "Admin" },
];

export function ChangeRoleForm({
  userId,
  currentRole,
  isSelf,
}: {
  userId: string;
  currentRole: Role;
  isSelf: boolean;
}) {
  const [error, formAction, pending] = useActionState(changeRoleAction, null);

  if (isSelf) {
    return (
      <span className="text-xs text-zinc-400 italic">
        {ROLES.find((r) => r.value === currentRole)?.label ?? currentRole}
      </span>
    );
  }

  return (
    <form action={formAction} className="flex items-center gap-2">
      <input type="hidden" name="userId" value={userId} />
      <select
        name="role"
        defaultValue={currentRole}
        className="rounded-md ring-input px-2 py-1 text-xs text-zinc-900 outline-none transition"
      >
        {ROLES.map((r) => (
          <option key={r.value} value={r.value}>
            {r.label}
          </option>
        ))}
      </select>
      <button
        type="submit"
        disabled={pending}
        className="px-2.5 py-1 text-xs font-medium text-zinc-600 bg-zinc-100 rounded-md hover:bg-zinc-200 transition-colors disabled:opacity-50"
      >
        {pending ? "Saving…" : "Save"}
      </button>
      {error && <span className="text-xs text-red-600">{error}</span>}
    </form>
  );
}
