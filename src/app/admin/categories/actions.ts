"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { auth } from "@/auth";
import { assertAuthenticated } from "@/lib/auth/assertions";
import { createCategory, deleteCategory } from "@/lib/categories/service";

export async function createCategoryAction(
  _prevState: string | null,
  formData: FormData
): Promise<string | null> {
  try {
    const session = await auth();
    const payload = assertAuthenticated(session);
    await createCategory({ name: formData.get("name") }, payload);
    revalidatePath("/admin/categories");
    return null;
  } catch (err) {
    return err instanceof Error ? err.message : "Something went wrong";
  }
}

export async function deleteCategoryAction(
  _prevState: string | null,
  formData: FormData
): Promise<string | null> {
  try {
    const session = await auth();
    const payload = assertAuthenticated(session);
    const id = z.string().cuid().parse(formData.get("id"));
    await deleteCategory(id, payload);
    revalidatePath("/admin/categories");
    return null;
  } catch (err) {
    return err instanceof Error ? err.message : "Something went wrong";
  }
}
