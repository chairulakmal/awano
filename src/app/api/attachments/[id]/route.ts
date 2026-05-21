import { auth } from "@/auth";
import { assertAuthenticated, AuthorizationError } from "@/lib/auth/assertions";
import { getAttachment } from "@/lib/attachments/service";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const session = await auth();

  try {
    const payload = assertAuthenticated(session);
    const attachment = await getAttachment(id, payload);

    return new Response(attachment.data, {
      headers: {
        "Content-Type": attachment.mimeType,
        "Content-Disposition": `inline; filename="${encodeURIComponent(attachment.filename)}"`,
        "Cache-Control": "private, max-age=3600",
      },
    });
  } catch (err) {
    if (err instanceof AuthorizationError) {
      return new Response(null, { status: 404 });
    }
    throw err;
  }
}
