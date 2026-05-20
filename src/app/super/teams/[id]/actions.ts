"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/auth";
import { assertAuthenticated } from "@/lib/auth/assertions";
import { seedDemoUsers } from "@/lib/teams/service";

export async function seedDemoAction(
  _prevState: string | null,
  formData: FormData
): Promise<string | null> {
  try {
    const session = await auth();
    const payload = assertAuthenticated(session);
    const teamId = formData.get("teamId") as string;
    const { created, total } = await seedDemoUsers(teamId, payload);
    revalidatePath(`/super/teams/${teamId}`);
    return created === 0
      ? "All demo users already exist"
      : `Created ${created} of ${total} demo users`;
  } catch (err) {
    return `Error: ${err instanceof Error ? err.message : "Something went wrong"}`;
  }
}
