"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { auth } from "@/auth";
import { assertAuthenticated } from "@/lib/auth/assertions";
import { createTeam } from "@/lib/teams/service";

export async function createTeamAction(
  _prevState: string | null,
  formData: FormData,
): Promise<string | null> {
  const session = await auth();
  const payload = assertAuthenticated(session);

  let teamId: string;
  try {
    const team = await createTeam(
      {
        name: formData.get("name"),
        slug: formData.get("slug"),
        notes: (formData.get("notes") as string) || undefined,
      },
      payload,
    );
    teamId = team.id;
  } catch (err) {
    return err instanceof Error ? err.message : "Something went wrong";
  }

  revalidatePath("/super/teams");
  redirect(`/super/teams/${teamId}`);
}
