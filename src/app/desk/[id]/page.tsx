import Link from "next/link";
import { notFound } from "next/navigation";
import { auth } from "@/auth";
import { assertAuthenticated, AuthorizationError } from "@/lib/auth/assertions";
import { getTicket } from "@/lib/tickets/service";
import { listTeamMembers } from "@/lib/users/service";
import { getAllowedTransitions } from "@/lib/tickets/fsm";
import { StatusForm } from "./StatusForm";
import { AssignForm } from "./AssignForm";
import { PriorityForm } from "./PriorityForm";
import { DeskCommentForm } from "./DeskCommentForm";
import { AttachmentList } from "@/components/AttachmentList";
import type { TicketStatus, TicketPriority } from "@/generated/prisma/enums";

const STATUS_LABEL: Record<TicketStatus, string> = {
  OPEN: "Open",
  IN_PROGRESS: "In progress",
  WAITING_ON_REQUESTER: "Waiting on requester",
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

const PRIORITY_LABEL: Record<TicketPriority, string> = {
  LOW: "Low",
  NORMAL: "Normal",
  HIGH: "High",
  URGENT: "Urgent",
};

const PRIORITY_CLASS: Record<TicketPriority, string> = {
  LOW: "text-fg-subtle",
  NORMAL: "text-fg-muted",
  HIGH: "text-amber-600",
  URGENT: "text-danger-text font-semibold",
};

export default async function DeskTicketPage({ params }: { params: Promise<{ id: string }> }) {
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

  const [members, allowedTransitions] = await Promise.all([
    listTeamMembers(payload),
    Promise.resolve(getAllowedTransitions(ticket.status, payload.role)),
  ]);

  return (
    <div>
      {/* Back link */}
      <Link
        href="/desk"
        className="inline-flex items-center gap-1 text-sm text-fg-subtle hover:text-fg transition-colors mb-6"
      >
        ← Inbox
      </Link>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main column */}
        <div className="lg:col-span-2 space-y-4">
          {/* Header */}
          <div>
            <div className="flex items-start justify-between gap-4">
              <h1 className="text-xl font-semibold text-fg-strong">{ticket.subject}</h1>
              <span
                className={`shrink-0 text-xs font-medium px-2.5 py-1 rounded-full ${STATUS_CLASS[ticket.status]}`}
              >
                {STATUS_LABEL[ticket.status]}
              </span>
            </div>
            <div className="mt-1.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-fg-subtle">
              <span>{ticket.category.name}</span>
              <span>·</span>
              <span className={PRIORITY_CLASS[ticket.priority]}>
                {PRIORITY_LABEL[ticket.priority]}
              </span>
              <span>·</span>
              <span>from {ticket.createdBy.name ?? ticket.createdBy.email}</span>
              <span>·</span>
              <span>{new Date(ticket.createdAt).toLocaleDateString()}</span>
            </div>
          </div>

          {/* Body */}
          <div className="rounded-xl shadow-card bg-surface px-5 py-5">
            <p className="text-sm text-fg whitespace-pre-wrap">{ticket.body}</p>
            <AttachmentList attachments={ticket.attachments} />
          </div>

          {/* Comment thread */}
          {ticket.comments.length > 0 && (
            <div className="space-y-3">
              {ticket.comments.map((comment) => (
                <div
                  key={comment.id}
                  className={`rounded-xl px-5 py-4 ${
                    comment.isInternal
                      ? "bg-accent-amber-surface border border-amber-100"
                      : "shadow-card bg-surface"
                  }`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-medium text-fg">
                        {comment.author.name ?? comment.author.id}
                      </span>
                      {comment.isInternal && (
                        <span className="text-xs text-accent-amber-text bg-accent-amber-surface px-1.5 py-0.5 rounded">
                          Internal
                        </span>
                      )}
                    </div>
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
              <h2 className="text-sm font-medium text-fg mb-4">Reply</h2>
              <DeskCommentForm ticketId={ticket.id} />
            </div>
          ) : (
            <p className="text-sm text-fg-subtle text-center py-4">This ticket is closed.</p>
          )}
        </div>

        {/* Sidebar */}
        <div className="space-y-4">
          {/* Status */}
          <div className="rounded-xl shadow-card bg-surface px-5 py-5">
            <StatusForm
              ticketId={ticket.id}
              currentStatus={ticket.status}
              allowedTransitions={allowedTransitions}
            />
          </div>

          {/* Assignee */}
          <div className="rounded-xl shadow-card bg-surface px-5 py-5">
            <AssignForm
              ticketId={ticket.id}
              currentAssigneeId={ticket.assigneeId}
              members={members}
              userId={payload.userId}
              role={payload.role}
            />
          </div>

          {/* Priority */}
          <div className="rounded-xl shadow-card bg-surface px-5 py-5">
            <PriorityForm ticketId={ticket.id} currentPriority={ticket.priority} />
          </div>

          {/* Timeline */}
          {ticket.statusEvents.length > 0 && (
            <div className="rounded-xl shadow-card bg-surface px-5 py-5">
              <h3 className="text-xs font-medium text-fg-muted uppercase tracking-wide mb-4">
                Timeline
              </h3>
              <ul className="space-y-3">
                {ticket.statusEvents.map((event) => (
                  <li key={event.id} className="flex items-start gap-2.5">
                    <div className="w-1.5 h-1.5 rounded-full bg-surface-subtle mt-1.5 shrink-0" />
                    <div className="text-xs">
                      <p className="text-fg">
                        {event.fromStatus
                          ? `${STATUS_LABEL[event.fromStatus]} → ${STATUS_LABEL[event.toStatus]}`
                          : STATUS_LABEL[event.toStatus]}
                      </p>
                      <p className="text-fg-subtle">
                        {event.actor.name ?? event.actor.id} ·{" "}
                        {new Date(event.createdAt).toLocaleDateString()}
                      </p>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
