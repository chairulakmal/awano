"use server";

import { revalidatePath } from "next/cache";
import { unstable_rethrow } from "next/navigation";
import { z } from "zod";
import { auth } from "@/auth";
import { assertAuthenticated } from "@/lib/auth/assertions";
import { postComment } from "@/lib/tickets/service";
import { addAttachment } from "@/lib/attachments/service";

export async function postCommentAction(
  _prevState: string | null,
  formData: FormData
): Promise<string | null> {
  const session = await auth();
  const payload = assertAuthenticated(session);

  const ticketId = z.string().min(1).parse(formData.get("ticketId"));
  const body = z.string().min(1).parse(formData.get("body"));

  let commentId: string;
  try {
    const comment = await postComment(ticketId, body, false, payload);
    commentId = comment.id;
  } catch (err) {
    unstable_rethrow(err);
    return "Failed to post reply. Please try again.";
  }

  const files = formData.getAll("attachments") as File[];
  for (const file of files) {
    if (!(file instanceof File) || file.size === 0) continue;
    try {
      const buffer = new Uint8Array(await file.arrayBuffer());
      await addAttachment(
        { ticketId, commentId, filename: file.name, mimeType: file.type, data: buffer },
        payload
      );
    } catch {
      // Attachment failure does not roll back the comment
    }
  }

  revalidatePath(`/tickets/${ticketId}`);
  return null;
}
