"use server";

import { revalidatePath } from "next/cache";
import { unstable_rethrow } from "next/navigation";
import { z } from "zod";
import { auth } from "@/auth";
import { assertAuthenticated } from "@/lib/auth/assertions";
import { postComment } from "@/lib/tickets/service";

export async function postCommentAction(
  _prevState: string | null,
  formData: FormData,
): Promise<string | null> {
  const session = await auth();
  const payload = assertAuthenticated(session);

  const ticketId = z.string().min(1).parse(formData.get("ticketId"));
  const body     = z.string().min(1).parse(formData.get("body"));

  try {
    await postComment(ticketId, body, false, payload);
  } catch (err) {
    unstable_rethrow(err);
    return "Failed to post reply. Please try again.";
  }

  revalidatePath(`/tickets/${ticketId}`);
  return null;
}
