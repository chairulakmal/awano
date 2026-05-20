"use client";

import { useActionState, useState } from "react";
import { createUserAction } from "./actions";

const ROLE_OPTIONS = [
  { value: "SUPPORT",   label: "Support" },
  { value: "MANAGER",   label: "Manager" },
  { value: "ADMIN",     label: "Admin" },
  { value: "REQUESTER", label: "Requester" },
];

const REQUESTER_TYPE_OPTIONS = [
  { value: "CUSTOMER",    label: "Customer" },
  { value: "RECRUITER",   label: "Recruiter" },
  { value: "FIELD_AGENT", label: "Field agent" },
];

export function NewUserForm({ teamId }: { teamId: string }) {
  const [error, formAction, pending] = useActionState(createUserAction, null);
  const [role, setRole] = useState("SUPPORT");

  return (
    <form action={formAction} className="space-y-4">
      <input type="hidden" name="teamId" value={teamId} />

      <div>
        <label className="block text-xs font-medium text-zinc-600 mb-1">Name</label>
        <input
          name="name"
          required
          placeholder="Full name"
          className="w-full rounded-lg ring-input px-3.5 py-2 text-sm text-zinc-900 placeholder:text-zinc-400 outline-none transition"
        />
      </div>

      <div>
        <label className="block text-xs font-medium text-zinc-600 mb-1">Email</label>
        <input
          name="email"
          type="email"
          required
          placeholder="user@example.com"
          className="w-full rounded-lg ring-input px-3.5 py-2 text-sm text-zinc-900 placeholder:text-zinc-400 outline-none transition"
        />
      </div>

      <div>
        <label className="block text-xs font-medium text-zinc-600 mb-1">Password</label>
        <input
          name="password"
          type="password"
          required
          minLength={8}
          placeholder="Min 8 characters"
          className="w-full rounded-lg ring-input px-3.5 py-2 text-sm text-zinc-900 placeholder:text-zinc-400 outline-none transition"
        />
      </div>

      <div>
        <label className="block text-xs font-medium text-zinc-600 mb-1">Role</label>
        <select
          name="role"
          value={role}
          onChange={(e) => setRole(e.target.value)}
          className="w-full rounded-lg ring-input px-3.5 py-2 text-sm text-zinc-900 outline-none transition bg-white"
        >
          {ROLE_OPTIONS.map(({ value, label }) => (
            <option key={value} value={value}>{label}</option>
          ))}
        </select>
      </div>

      {role === "REQUESTER" && (
        <div>
          <label className="block text-xs font-medium text-zinc-600 mb-1">Requester type</label>
          <select
            name="requesterType"
            className="w-full rounded-lg ring-input px-3.5 py-2 text-sm text-zinc-900 outline-none transition bg-white"
          >
            {REQUESTER_TYPE_OPTIONS.map(({ value, label }) => (
              <option key={value} value={value}>{label}</option>
            ))}
          </select>
        </div>
      )}

      {error && <p className="text-xs text-red-600">{error}</p>}

      <button
        type="submit"
        disabled={pending}
        className="w-full px-4 py-2 bg-primary text-white text-sm font-semibold rounded-lg hover:bg-primary-hover transition-colors shadow-sm disabled:opacity-50"
      >
        {pending ? "Creating…" : "Create user"}
      </button>
    </form>
  );
}
