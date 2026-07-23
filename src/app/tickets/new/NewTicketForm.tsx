"use client";

import { useActionState, useRef, useTransition } from "react";
import { createTicketAction } from "./actions";
import { FilePicker } from "@/components/FilePicker";

type Category = { id: string; name: string };

export function NewTicketForm({ categories }: { categories: Category[] }) {
  const [error, formAction, pending] = useActionState(createTicketAction, null);
  const [, startTransition] = useTransition();
  const formRef = useRef<HTMLFormElement>(null);
  const pendingFiles = useRef<File[]>([]);

  async function handleSubmit(e: React.SyntheticEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    for (const file of pendingFiles.current) {
      fd.append("attachments", file, file.name);
    }
    startTransition(() => formAction(fd));
  }

  return (
    <form ref={formRef} onSubmit={handleSubmit} className="flex flex-col gap-5">
      <div className="flex flex-col gap-1.5">
        <label htmlFor="categoryId" className="text-sm font-medium text-fg">
          Category
        </label>
        <select
          id="categoryId"
          name="categoryId"
          required
          defaultValue=""
          className="w-full rounded-lg ring-input px-3.5 py-2.5 text-sm text-fg-strong bg-surface outline-none transition"
        >
          <option value="" disabled>
            Select a category
          </option>
          {categories.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
      </div>

      <div className="flex flex-col gap-1.5">
        <label htmlFor="subject" className="text-sm font-medium text-fg">
          Subject
        </label>
        <input
          id="subject"
          name="subject"
          type="text"
          required
          maxLength={255}
          placeholder="Brief summary of your request"
          className="w-full rounded-lg ring-input px-3.5 py-2.5 text-sm text-fg-strong placeholder:text-fg-subtle outline-none transition"
        />
      </div>

      <div className="flex flex-col gap-1.5">
        <label htmlFor="body" className="text-sm font-medium text-fg">
          Details
        </label>
        <textarea
          id="body"
          name="body"
          required
          rows={5}
          placeholder="Describe your request in detail…"
          className="w-full rounded-lg ring-input px-3.5 py-2.5 text-sm text-fg-strong placeholder:text-fg-subtle outline-none transition resize-none"
        />
      </div>

      <div className="flex flex-col gap-1.5">
        <span className="text-sm font-medium text-fg">Attachments</span>
        <p className="text-xs text-fg-subtle">PNG, JPG up to 2 MB · PDF up to 1 MB</p>
        <FilePicker
          onFiles={(files) => {
            pendingFiles.current = files;
          }}
        />
      </div>

      {error && (
        <p className="rounded-lg bg-danger-surface border border-danger-border px-3.5 py-2.5 text-sm text-danger-text">
          {error}
        </p>
      )}

      <button
        type="submit"
        disabled={pending}
        className="mt-1 w-full h-12 rounded-lg bg-primary text-primary-fg text-base font-semibold hover:bg-primary-hover transition-colors shadow-sm disabled:cursor-not-allowed disabled:opacity-50"
      >
        {pending ? "Submitting…" : "Submit ticket"}
      </button>
    </form>
  );
}
