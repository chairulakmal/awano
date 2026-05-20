import { Role, TicketStatus } from "@/generated/prisma/enums";
import { AuthorizationError } from "@/lib/auth/assertions";

type Transition = { from: TicketStatus; to: TicketStatus; minRole: Role };

const ROLE_RANK: Record<Role, number> = {
  REQUESTER: 0,
  SUPPORT:   1,
  MANAGER:   2,
  ADMIN:     3,
  SUPER:     4,
};

const TRANSITIONS: Transition[] = [
  { from: TicketStatus.OPEN,                  to: TicketStatus.IN_PROGRESS,          minRole: Role.SUPPORT  },
  { from: TicketStatus.IN_PROGRESS,           to: TicketStatus.WAITING_ON_REQUESTER, minRole: Role.SUPPORT  },
  { from: TicketStatus.IN_PROGRESS,           to: TicketStatus.ESCALATED,            minRole: Role.MANAGER  },
  { from: TicketStatus.IN_PROGRESS,           to: TicketStatus.RESOLVED,             minRole: Role.SUPPORT  },
  { from: TicketStatus.WAITING_ON_REQUESTER,  to: TicketStatus.IN_PROGRESS,          minRole: Role.SUPPORT  },
  { from: TicketStatus.ESCALATED,             to: TicketStatus.IN_PROGRESS,          minRole: Role.MANAGER  },
  { from: TicketStatus.RESOLVED,              to: TicketStatus.CLOSED,               minRole: Role.SUPPORT  },
  { from: TicketStatus.RESOLVED,              to: TicketStatus.IN_PROGRESS,          minRole: Role.MANAGER  },
  { from: TicketStatus.CLOSED,               to: TicketStatus.OPEN,                 minRole: Role.MANAGER  },
];

export function assertTransition(from: TicketStatus, to: TicketStatus, role: Role): void {
  const t = TRANSITIONS.find((t) => t.from === from && t.to === to);
  if (!t) throw new AuthorizationError(`No valid transition from ${from} to ${to}`);
  if (ROLE_RANK[role] < ROLE_RANK[t.minRole]) {
    throw new AuthorizationError(`${from} → ${to} requires ${t.minRole} or higher`);
  }
}

export function getAllowedTransitions(from: TicketStatus, role: Role): TicketStatus[] {
  return TRANSITIONS
    .filter((t) => t.from === from && ROLE_RANK[role] >= ROLE_RANK[t.minRole])
    .map((t) => t.to);
}
