"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { auth } from "@/auth";
import { assertAuthenticated } from "@/lib/auth/assertions";
import { changeUserRole } from "@/lib/users/service";
import { Role } from "@/generated/prisma/enums";

export async function changeRoleAction(
  _prevState: string | null,
  formData: FormData,
): Promise<string | null> {
  try {
    const session = await auth();
    const payload = assertAuthenticated(session);
    const userId = z.string().cuid().parse(formData.get("userId"));
    const role   = z.nativeEnum(Role).parse(formData.get("role"));
    await changeUserRole(userId, role, payload);
    revalidatePath("/admin/users");
    return null;
  } catch (err) {
    return err instanceof Error ? err.message : "Something went wrong";
  }
}
