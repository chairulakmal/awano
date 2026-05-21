"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { auth } from "@/auth";
import { assertAuthenticated } from "@/lib/auth/assertions";
import { changeUserRole } from "@/lib/users/service";
import { Role, RequesterType } from "@/generated/prisma/enums";

// Form sends a composite value: "REQUESTER-FIELD_AGENT", "SUPPORT", "MANAGER", etc.
function parseRoleValue(raw: string): { role: Role; requesterType: RequesterType | null } {
  if (raw.startsWith("REQUESTER-")) {
    const requesterType = z.nativeEnum(RequesterType).parse(raw.slice("REQUESTER-".length));
    return { role: "REQUESTER", requesterType };
  }
  return { role: z.nativeEnum(Role).parse(raw), requesterType: null };
}

export async function changeRoleAction(
  _prevState: string | null,
  formData: FormData
): Promise<string | null> {
  try {
    const session = await auth();
    const payload = assertAuthenticated(session);
    const userId = z.string().cuid().parse(formData.get("userId"));
    const { role, requesterType } = parseRoleValue(
      z.string().min(1).parse(formData.get("roleValue"))
    );
    await changeUserRole(userId, role, requesterType, payload);
    revalidatePath("/admin/users");
    return null;
  } catch (err) {
    return err instanceof Error ? err.message : "Something went wrong";
  }
}
