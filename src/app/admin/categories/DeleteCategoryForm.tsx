"use client";

import { useActionState } from "react";
import { deleteCategoryAction } from "./actions";

export function DeleteCategoryForm({ categoryId }: { categoryId: string }) {
  const [error, formAction, pending] = useActionState(deleteCategoryAction, null);

  return (
    <form action={formAction} className="flex flex-col items-end gap-1">
      <input type="hidden" name="id" value={categoryId} />
      <button
        type="submit"
        disabled={pending}
        className="text-xs text-red-500 hover:text-red-700 transition-colors disabled:opacity-50"
      >
        {pending ? "Deleting…" : "Delete"}
      </button>
      {error && <p className="text-xs text-red-600">{error}</p>}
    </form>
  );
}
