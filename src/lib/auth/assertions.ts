import type { Session } from "next-auth";
import type { Role, RequesterType } from "@/generated/prisma/enums";

// ---------------------------------------------------------------------------
// Typed errors: server actions check instanceof to map to the right status
// ---------------------------------------------------------------------------

export class AuthenticationError extends Error {
  readonly status = 401 as const;
  constructor() {
    super("Not authenticated");
    this.name = "AuthenticationError";
  }
}

export class AuthorizationError extends Error {
  readonly status = 403 as const;
  constructor(message = "Forbidden") {
    super(message);
    this.name = "AuthorizationError";
  }
}

// ---------------------------------------------------------------------------
// Normalized session payload: what server actions work with after asserting
// ---------------------------------------------------------------------------

export type SessionPayload = {
  userId: string;
  teamId: string | null;
  role: Role;
  requesterType?: RequesterType;
};

// Minimal shapes needed for ticket assertions
type TeamScoped = { teamId: string };
type TicketRef = TeamScoped & { createdById: string };

// ---------------------------------------------------------------------------
// Assertions
// ---------------------------------------------------------------------------

/** Extracts and returns a typed payload, or throws 401. */
export function assertAuthenticated(session: Session | null): SessionPayload {
  if (!session?.user?.id || !session.user.role) throw new AuthenticationError();
  return {
    userId: session.user.id,
    teamId: session.user.teamId,
    role: session.user.role,
    requesterType: session.user.requesterType,
  };
}

/** Throws 403 if the session role is not in the allowed list. */
export function assertRole(payload: SessionPayload, allowedRoles: Role[]): void {
  if (!allowedRoles.includes(payload.role)) {
    throw new AuthorizationError("Insufficient role");
  }
}

/**
 * Throws 403 if the resource belongs to a different team.
 * SUPER users bypass this check; they have cross-team read access.
 * (Update actions in the SUPER service layer must not call this.)
 */
export function assertSameTeam(payload: SessionPayload, resource: TeamScoped): void {
  if (payload.role === "SUPER") return;
  if (payload.teamId !== resource.teamId) {
    throw new AuthorizationError("Cross-team access denied");
  }
}

/**
 * Throws 403 if the user cannot view this ticket.
 * - Must be on the same team (SUPER exempt).
 * - REQUESTERs may only view tickets they created.
 */
export function assertCanViewTicket(payload: SessionPayload, ticket: TicketRef): void {
  assertSameTeam(payload, ticket);
  if (payload.role === "REQUESTER" && ticket.createdById !== payload.userId) {
    throw new AuthorizationError("Requesters can only view their own tickets");
  }
}

/**
 * Throws 403 if the user cannot mutate this ticket (status, assignee, priority).
 * REQUESTERs may post comments but cannot change ticket fields; use assertCanViewTicket for that.
 */
export function assertCanUpdateTicket(payload: SessionPayload, ticket: TicketRef): void {
  assertSameTeam(payload, ticket);
  if (payload.role === "REQUESTER") {
    throw new AuthorizationError("Requesters cannot update ticket fields");
  }
}
