"use client";

import { useActionState, useRef, useEffect, useState, useTransition } from "react";
import { postCommentAction } from "./actions";
import { FilePicker } from "@/components/FilePicker";

export function CommentForm({ ticketId }: { ticketId: string }) {
  const [error, formAction, pending] = useActionState(postCommentAction, null);
  const [, startTransition] = useTransition();
  const ref = useRef<HTMLFormElement>(null);
  const [pendingFiles, setPendingFiles] = useState<File[]>([]);

  useEffect(() => {
    if (!pending && !error) {
      ref.current?.reset();
      setPendingFiles([]);
    }
  }, [pending, error]);

  async function handleSubmit(e: React.SyntheticEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    for (const file of pendingFiles) {
      fd.append("attachments", file, file.name);
    }
    startTransition(() => formAction(fd));
  }

  return (
    <form ref={ref} onSubmit={handleSubmit} className="flex flex-col gap-4">
      <input type="hidden" name="ticketId" value={ticketId} />
      <textarea
        name="body"
        required
        rows={3}
        placeholder="Write your reply…"
        className="w-full rounded-lg ring-input px-3.5 py-2.5 text-sm text-zinc-900 placeholder:text-zinc-400 outline-none transition resize-none"
      />
      <FilePicker onFiles={setPendingFiles} />
      {error && (
        <p className="rounded-lg bg-red-50 border border-red-100 px-3.5 py-2.5 text-sm text-red-600">
          {error}
        </p>
      )}
      <div className="flex justify-end">
        <button
          type="submit"
          disabled={pending}
          className="px-5 py-2 bg-primary text-white text-sm font-semibold rounded-lg hover:bg-primary-hover transition-colors shadow-sm disabled:cursor-not-allowed disabled:opacity-50"
        >
          {pending ? "Sending…" : "Send reply"}
        </button>
      </div>
    </form>
  );
}
