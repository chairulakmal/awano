"use client";

import { useActionState, useEffect } from "react";
import { signOut } from "next-auth/react";
import { changePasswordAction } from "./actions";

export function ChangePasswordForm({
  onDirtyChange,
}: {
  onDirtyChange?: (dirty: boolean) => void;
}) {
  const [state, formAction, pending] = useActionState(changePasswordAction, null);

  useEffect(() => {
    if (!state?.ok) return;
    onDirtyChange?.(false);
    const timer = setTimeout(() => signOut({ callbackUrl: "/login" }), 1400);
    return () => clearTimeout(timer);
  }, [state, onDirtyChange]);

  return (
    <form action={formAction} onChange={() => onDirtyChange?.(true)} className="space-y-4">
      <div className="space-y-1">
        <label htmlFor="currentPassword" className="block text-sm font-medium text-zinc-700">
          Current password
        </label>
        <input
          id="currentPassword"
          name="currentPassword"
          type="password"
          required
          className="w-full rounded-md ring-input px-3 py-2 text-sm text-zinc-900 outline-none transition"
        />
      </div>

      <div className="space-y-1">
        <label htmlFor="newPassword" className="block text-sm font-medium text-zinc-700">
          New password
          <span className="ml-1 text-xs font-normal text-zinc-400">(min. 15 characters)</span>
        </label>
        <input
          id="newPassword"
          name="newPassword"
          type="password"
          required
          minLength={15}
          className="w-full rounded-md ring-input px-3 py-2 text-sm text-zinc-900 outline-none transition"
        />
      </div>

      <div className="space-y-1">
        <label htmlFor="confirmPassword" className="block text-sm font-medium text-zinc-700">
          Confirm new password
        </label>
        <input
          id="confirmPassword"
          name="confirmPassword"
          type="password"
          required
          minLength={15}
          className="w-full rounded-md ring-input px-3 py-2 text-sm text-zinc-900 outline-none transition"
        />
      </div>

      <div className="flex items-center gap-4 pt-1">
        <button
          type="submit"
          disabled={pending}
          className="px-4 py-2 text-sm font-medium text-white bg-primary rounded-md hover:bg-primary-hover transition-colors disabled:opacity-50"
        >
          {pending ? "Saving…" : "Update password"}
        </button>

        {state && (
          <span className={`text-sm ${state.ok ? "text-green-600" : "text-red-600"}`}>
            {state.message}
          </span>
        )}
      </div>
    </form>
  );
}
