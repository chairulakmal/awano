"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/auth";
import { assertAuthenticated } from "@/lib/auth/assertions";
import { changeUserRole } from "@/lib/users/service";
import type { Role } from "@/generated/prisma/enums";

export async function changeRoleAction(
  _prevState: string | null,
  formData: FormData,
): Promise<string | null> {
  try {
    const session = await auth();
    const payload = assertAuthenticated(session);
    const userId = formData.get("userId") as string;
    const role   = formData.get("role") as Role;
    await changeUserRole(userId, role, payload);
    revalidatePath("/admin/users");
    return null;
  } catch (err) {
    return err instanceof Error ? err.message : "Something went wrong";
  }
}
