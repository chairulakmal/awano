"use client";

import { useActionState, useRef, useEffect } from "react";
import { postDeskCommentAction } from "./actions";

export function DeskCommentForm({ ticketId }: { ticketId: string }) {
  const [error, formAction, pending] = useActionState(postDeskCommentAction, null);
  const ref = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (!pending && !error) ref.current?.reset();
  }, [pending, error]);

  return (
    <form ref={ref} action={formAction} className="flex flex-col gap-4">
      <input type="hidden" name="ticketId" value={ticketId} />
      <textarea
        name="body"
        required
        rows={3}
        placeholder="Write a reply or internal note…"
        className="w-full rounded-lg ring-input px-3.5 py-2.5 text-sm text-zinc-900 placeholder:text-zinc-400 outline-none transition resize-none"
      />
      {error && (
        <p className="rounded-lg bg-red-50 border border-red-100 px-3.5 py-2.5 text-sm text-red-600">
          {error}
        </p>
      )}
      <div className="flex items-center justify-between">
        <label className="flex items-center gap-2 text-sm text-zinc-600 cursor-pointer select-none">
          <input type="checkbox" name="isInternal" value="true" className="rounded" />
          Internal note
        </label>
        <button
          type="submit"
          disabled={pending}
          className="px-5 py-2 bg-primary text-white text-sm font-semibold rounded-lg hover:bg-primary-hover transition-colors shadow-sm disabled:cursor-not-allowed disabled:opacity-50"
        >
          {pending ? "Sending…" : "Send"}
        </button>
      </div>
    </form>
  );
}
