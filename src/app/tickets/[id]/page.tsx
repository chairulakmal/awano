import { notFound } from "next/navigation";
import { auth } from "@/auth";
import { assertAuthenticated, AuthorizationError } from "@/lib/auth/assertions";
import { getTicket } from "@/lib/tickets/service";
import { CommentForm } from "./CommentForm";
import { AttachmentList } from "@/components/AttachmentList";
import type { TicketStatus } from "@/generated/prisma/enums";

const STATUS_LABEL: Record<TicketStatus, string> = {
  OPEN: "Open",
  IN_PROGRESS: "In progress",
  WAITING_ON_REQUESTER: "Waiting on you",
  ESCALATED: "Escalated",
  RESOLVED: "Resolved",
  CLOSED: "Closed",
};

const STATUS_CLASS: Record<TicketStatus, string> = {
  OPEN: "bg-surface-subtle text-fg-secondary",
  IN_PROGRESS: "bg-blue-50 text-blue-700",
  WAITING_ON_REQUESTER: "bg-accent-amber-surface text-accent-amber-text",
  ESCALATED: "bg-danger-surface text-danger-text",
  RESOLVED: "bg-green-50 text-green-700",
  CLOSED: "bg-surface-subtle text-fg-subtle",
};

export default async function TicketDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await auth();
  const payload = assertAuthenticated(session);

  let ticket;
  try {
    ticket = await getTicket(id, payload);
  } catch (err) {
    if (err instanceof AuthorizationError) notFound();
    throw err;
  }

  return (
    <div className="max-w-2xl">
      {/* Ticket header */}
      <div className="mb-6">
        <div className="flex items-start justify-between gap-4">
          <h1 className="font-display text-xl font-semibold text-fg-strong">{ticket.subject}</h1>
          <span
            className={`shrink-0 text-xs font-medium px-2.5 py-1 rounded-full ${STATUS_CLASS[ticket.status]}`}
          >
            {STATUS_LABEL[ticket.status]}
          </span>
        </div>
        <div className="mt-1.5 flex items-center gap-2 text-xs text-fg-subtle">
          <span>{ticket.category.name}</span>
          <span>·</span>
          <span>{new Date(ticket.createdAt).toLocaleDateString()}</span>
        </div>
      </div>

      {/* Original body */}
      <div className="rounded-xl shadow-card bg-surface px-5 py-5 mb-4">
        <p className="text-sm text-fg whitespace-pre-wrap">{ticket.body}</p>
        <AttachmentList attachments={ticket.attachments} />
      </div>

      {/* Comment thread */}
      {ticket.comments.length > 0 && (
        <div className="space-y-3 mb-4">
          {ticket.comments.map((comment) => (
            <div key={comment.id} className="rounded-xl shadow-card bg-surface px-5 py-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-medium text-fg">
                  {comment.author.name ?? comment.author.id}
                </span>
                <span className="text-xs text-fg-subtle">
                  {new Date(comment.createdAt).toLocaleDateString()}
                </span>
              </div>
              <p className="text-sm text-fg whitespace-pre-wrap">{comment.body}</p>
              <AttachmentList attachments={comment.attachments} />
            </div>
          ))}
        </div>
      )}

      {/* Reply form */}
      {ticket.status !== "CLOSED" ? (
        <div className="rounded-xl shadow-panel bg-surface px-5 py-5">
          <h2 className="text-sm font-medium text-fg mb-4">Add a reply</h2>
          <CommentForm ticketId={ticket.id} />
        </div>
      ) : (
        <p className="text-sm text-fg-subtle text-center py-6">This ticket is closed.</p>
      )}
    </div>
  );
}
