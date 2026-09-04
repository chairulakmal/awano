"use client";

import { useActionState, useState } from "react";
import { changeRoleAction } from "./actions";
import type { Role, RequesterType } from "@/generated/prisma/enums";

type RoleOption = { value: string; label: string; role: Role };

const ALL_OPTIONS: RoleOption[] = [
  { value: "REQUESTER-CUSTOMER", label: "Requester (Customer)", role: "REQUESTER" },
  { value: "REQUESTER-RECRUITER", label: "Requester (Recruiter)", role: "REQUESTER" },
  { value: "REQUESTER-FIELD_AGENT", label: "Requester (Field Agent)", role: "REQUESTER" },
  { value: "SUPPORT", label: "Support", role: "SUPPORT" },
  { value: "MANAGER", label: "Manager", role: "MANAGER" },
  { value: "ADMIN", label: "Admin", role: "ADMIN" },
];

const ROLE_RANK: Record<Role, number> = {
  REQUESTER: 0,
  SUPPORT: 1,
  MANAGER: 2,
  ADMIN: 3,
  SUPER: 4,
};

const ASSIGNABLE_CEILING: Record<Role, number> = {
  REQUESTER: -1,
  SUPPORT: -1,
  MANAGER: 1,
  ADMIN: 2,
  SUPER: 3,
};

export function ChangeRoleForm({
  userId,
  userLabel,
  currentRole,
  currentRequesterType,
  isSelf,
  sessionRole,
}: {
  userId: string;
  userLabel: string;
  currentRole: Role;
  currentRequesterType: RequesterType | null;
  isSelf: boolean;
  sessionRole: Role;
}) {
  const [error, formAction, pending] = useActionState(changeRoleAction, null);

  const currentValue =
    currentRole === "REQUESTER" ? `REQUESTER-${currentRequesterType ?? "CUSTOMER"}` : currentRole;

  const [selected, setSelected] = useState(currentValue);

  const visibleOptions = ALL_OPTIONS.filter((opt) => {
    if (ROLE_RANK[opt.role] > ASSIGNABLE_CEILING[sessionRole]) return false;
    // SUPPORT is only available once the user is already a FIELD_AGENT requester.
    // (Demoting from MANAGER/SUPPORT to SUPPORT is still allowed.)
    if (
      opt.role === "SUPPORT" &&
      currentRole === "REQUESTER" &&
      currentRequesterType !== "FIELD_AGENT"
    )
      return false;
    return true;
  });

  const currentLabel = ALL_OPTIONS.find((o) => o.value === currentValue)?.label ?? currentRole;

  if (isSelf) {
    return <span className="text-xs text-fg-subtle italic">{currentLabel}</span>;
  }

  if (ROLE_RANK[currentRole] > ASSIGNABLE_CEILING[sessionRole]) {
    return (
      <span
        className="text-xs text-fg-subtle italic"
        title="This user's role can only be changed by a higher role"
      >
        {currentLabel}
      </span>
    );
  }

  return (
    <form key={currentValue} action={formAction} className="flex items-center gap-2">
      <input type="hidden" name="userId" value={userId} />
      <select
        name="roleValue"
        aria-label={`Role for ${userLabel}`}
        value={selected}
        onChange={(e) => setSelected(e.target.value)}
        className="rounded-md ring-input px-2 py-1 text-xs text-fg-strong outline-none transition"
      >
        {visibleOptions.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>
      <button
        type="submit"
        disabled={pending || selected === currentValue}
        className="px-2.5 py-1 text-xs font-medium text-fg-secondary bg-surface-subtle rounded-md hover:bg-surface-subtle transition-colors disabled:opacity-50"
      >
        {pending ? "Saving…" : "Save"}
      </button>
      {error && <span className="text-xs text-danger-text">{error}</span>}
      {currentRole === "REQUESTER" && currentRequesterType !== "FIELD_AGENT" && (
        <span className="text-xs text-fg-subtle">Set to Field Agent first to unlock Support</span>
      )}
    </form>
  );
}
