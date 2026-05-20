"use client";

import { useActionState, useRef, useEffect } from "react";
import { createCategoryAction } from "./actions";

export function NewCategoryForm() {
  const [error, formAction, pending] = useActionState(createCategoryAction, null);
  const ref = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (!pending && !error) ref.current?.reset();
  }, [pending, error]);

  return (
    <form ref={ref} action={formAction} className="flex items-start gap-3">
      <div className="flex-1">
        <input
          name="name"
          required
          placeholder="Category name"
          className="w-full rounded-lg ring-input px-3.5 py-2 text-sm text-zinc-900 placeholder:text-zinc-400 outline-none transition"
        />
        {error && (
          <p className="mt-1.5 text-xs text-red-600">{error}</p>
        )}
      </div>
      <button
        type="submit"
        disabled={pending}
        className="shrink-0 px-4 py-2 bg-primary text-white text-sm font-semibold rounded-lg hover:bg-primary-hover transition-colors shadow-sm disabled:opacity-50"
      >
        {pending ? "Adding…" : "Add category"}
      </button>
    </form>
  );
}
