"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { auth } from "@/auth";
import { assertAuthenticated } from "@/lib/auth/assertions";
import { createUserInTeam } from "@/lib/teams/service";

export async function createUserAction(
  _prevState: string | null,
  formData: FormData,
): Promise<string | null> {
  const session = await auth();
  const payload = assertAuthenticated(session);
  const teamId = formData.get("teamId") as string;

  try {
    await createUserInTeam(
      teamId,
      {
        name: formData.get("name"),
        email: formData.get("email"),
        password: formData.get("password"),
        role: formData.get("role"),
        requesterType: (formData.get("requesterType") as string) || undefined,
      },
      payload,
    );
  } catch (err) {
    return err instanceof Error ? err.message : "Something went wrong";
  }

  revalidatePath(`/super/teams/${teamId}`);
  redirect(`/super/teams/${teamId}`);
}
