import { describe, it, expect } from "vitest";
import { Role, TicketStatus } from "@/generated/prisma/enums";
import { assertTransition, getAllowedTransitions } from "./fsm";
import { AuthorizationError } from "@/lib/auth/assertions";

// ---------------------------------------------------------------------------
// assertTransition
// ---------------------------------------------------------------------------

describe("assertTransition — valid transitions", () => {
  it("OPEN → IN_PROGRESS as SUPPORT", () => {
    expect(() => assertTransition(TicketStatus.OPEN, TicketStatus.IN_PROGRESS, Role.SUPPORT)).not.toThrow();
  });

  it("IN_PROGRESS → WAITING_ON_REQUESTER as SUPPORT", () => {
    expect(() =>
      assertTransition(TicketStatus.IN_PROGRESS, TicketStatus.WAITING_ON_REQUESTER, Role.SUPPORT),
    ).not.toThrow();
  });

  it("IN_PROGRESS → ESCALATED as MANAGER", () => {
    expect(() =>
      assertTransition(TicketStatus.IN_PROGRESS, TicketStatus.ESCALATED, Role.MANAGER),
    ).not.toThrow();
  });

  it("IN_PROGRESS → ESCALATED as ADMIN (ADMIN rank > MANAGER)", () => {
    expect(() =>
      assertTransition(TicketStatus.IN_PROGRESS, TicketStatus.ESCALATED, Role.ADMIN),
    ).not.toThrow();
  });

  it("IN_PROGRESS → RESOLVED as SUPPORT", () => {
    expect(() =>
      assertTransition(TicketStatus.IN_PROGRESS, TicketStatus.RESOLVED, Role.SUPPORT),
    ).not.toThrow();
  });

  it("WAITING_ON_REQUESTER → IN_PROGRESS as SUPPORT", () => {
    expect(() =>
      assertTransition(TicketStatus.WAITING_ON_REQUESTER, TicketStatus.IN_PROGRESS, Role.SUPPORT),
    ).not.toThrow();
  });

  it("ESCALATED → IN_PROGRESS as MANAGER", () => {
    expect(() =>
      assertTransition(TicketStatus.ESCALATED, TicketStatus.IN_PROGRESS, Role.MANAGER),
    ).not.toThrow();
  });

  it("RESOLVED → CLOSED as SUPPORT", () => {
    expect(() =>
      assertTransition(TicketStatus.RESOLVED, TicketStatus.CLOSED, Role.SUPPORT),
    ).not.toThrow();
  });

  it("RESOLVED → IN_PROGRESS (reopen) as MANAGER", () => {
    expect(() =>
      assertTransition(TicketStatus.RESOLVED, TicketStatus.IN_PROGRESS, Role.MANAGER),
    ).not.toThrow();
  });

  it("CLOSED → OPEN (reopen) as MANAGER", () => {
    expect(() =>
      assertTransition(TicketStatus.CLOSED, TicketStatus.OPEN, Role.MANAGER),
    ).not.toThrow();
  });
});

describe("assertTransition — insufficient role", () => {
  it("SUPPORT cannot escalate IN_PROGRESS → ESCALATED", () => {
    expect(() =>
      assertTransition(TicketStatus.IN_PROGRESS, TicketStatus.ESCALATED, Role.SUPPORT),
    ).toThrow(AuthorizationError);
  });

  it("SUPPORT cannot de-escalate ESCALATED → IN_PROGRESS", () => {
    expect(() =>
      assertTransition(TicketStatus.ESCALATED, TicketStatus.IN_PROGRESS, Role.SUPPORT),
    ).toThrow(AuthorizationError);
  });

  it("SUPPORT cannot reopen a RESOLVED ticket", () => {
    expect(() =>
      assertTransition(TicketStatus.RESOLVED, TicketStatus.IN_PROGRESS, Role.SUPPORT),
    ).toThrow(AuthorizationError);
  });

  it("SUPPORT cannot reopen a CLOSED ticket", () => {
    expect(() =>
      assertTransition(TicketStatus.CLOSED, TicketStatus.OPEN, Role.SUPPORT),
    ).toThrow(AuthorizationError);
  });

  it("REQUESTER cannot perform any transition", () => {
    expect(() =>
      assertTransition(TicketStatus.OPEN, TicketStatus.IN_PROGRESS, Role.REQUESTER),
    ).toThrow(AuthorizationError);
  });
});

describe("assertTransition — nonexistent transitions", () => {
  it("OPEN → RESOLVED has no path", () => {
    expect(() =>
      assertTransition(TicketStatus.OPEN, TicketStatus.RESOLVED, Role.SUPER),
    ).toThrow(AuthorizationError);
  });

  it("CLOSED → IN_PROGRESS has no path", () => {
    expect(() =>
      assertTransition(TicketStatus.CLOSED, TicketStatus.IN_PROGRESS, Role.SUPER),
    ).toThrow(AuthorizationError);
  });

  it("OPEN → OPEN (self-loop) has no path", () => {
    expect(() =>
      assertTransition(TicketStatus.OPEN, TicketStatus.OPEN, Role.SUPER),
    ).toThrow(AuthorizationError);
  });

  it("OPEN → ESCALATED has no path", () => {
    expect(() =>
      assertTransition(TicketStatus.OPEN, TicketStatus.ESCALATED, Role.SUPER),
    ).toThrow(AuthorizationError);
  });

  it("ESCALATED → CLOSED has no path", () => {
    expect(() =>
      assertTransition(TicketStatus.ESCALATED, TicketStatus.CLOSED, Role.SUPER),
    ).toThrow(AuthorizationError);
  });

  it("WAITING_ON_REQUESTER → RESOLVED has no path", () => {
    expect(() =>
      assertTransition(TicketStatus.WAITING_ON_REQUESTER, TicketStatus.RESOLVED, Role.SUPER),
    ).toThrow(AuthorizationError);
  });
});

describe("assertTransition — error message content", () => {
  it("nonexistent transition error names both states", () => {
    expect(() =>
      assertTransition(TicketStatus.OPEN, TicketStatus.CLOSED, Role.SUPER),
    ).toThrow(/OPEN.*CLOSED|CLOSED.*OPEN/);
  });

  it("insufficient-role error names the required role", () => {
    expect(() =>
      assertTransition(TicketStatus.IN_PROGRESS, TicketStatus.ESCALATED, Role.SUPPORT),
    ).toThrow(/MANAGER/);
  });
});

describe("assertTransition — ADMIN role (rank above MANAGER)", () => {
  it("ADMIN can de-escalate ESCALATED → IN_PROGRESS", () => {
    expect(() =>
      assertTransition(TicketStatus.ESCALATED, TicketStatus.IN_PROGRESS, Role.ADMIN),
    ).not.toThrow();
  });

  it("ADMIN can reopen CLOSED → OPEN", () => {
    expect(() =>
      assertTransition(TicketStatus.CLOSED, TicketStatus.OPEN, Role.ADMIN),
    ).not.toThrow();
  });

  it("ADMIN can reopen RESOLVED → IN_PROGRESS", () => {
    expect(() =>
      assertTransition(TicketStatus.RESOLVED, TicketStatus.IN_PROGRESS, Role.ADMIN),
    ).not.toThrow();
  });
});

// ---------------------------------------------------------------------------
// getAllowedTransitions
// ---------------------------------------------------------------------------

describe("getAllowedTransitions", () => {
  it("SUPPORT from OPEN can only go to IN_PROGRESS", () => {
    expect(getAllowedTransitions(TicketStatus.OPEN, Role.SUPPORT)).toEqual([TicketStatus.IN_PROGRESS]);
  });

  it("REQUESTER from OPEN sees no transitions", () => {
    expect(getAllowedTransitions(TicketStatus.OPEN, Role.REQUESTER)).toEqual([]);
  });

  it("SUPPORT from IN_PROGRESS can go to WAITING_ON_REQUESTER and RESOLVED but not ESCALATED", () => {
    const allowed = getAllowedTransitions(TicketStatus.IN_PROGRESS, Role.SUPPORT);
    expect(allowed).toContain(TicketStatus.WAITING_ON_REQUESTER);
    expect(allowed).toContain(TicketStatus.RESOLVED);
    expect(allowed).not.toContain(TicketStatus.ESCALATED);
  });

  it("MANAGER from IN_PROGRESS also gets ESCALATED", () => {
    const allowed = getAllowedTransitions(TicketStatus.IN_PROGRESS, Role.MANAGER);
    expect(allowed).toContain(TicketStatus.ESCALATED);
    expect(allowed).toContain(TicketStatus.WAITING_ON_REQUESTER);
    expect(allowed).toContain(TicketStatus.RESOLVED);
  });

  it("SUPPORT from RESOLVED can close but not reopen", () => {
    const allowed = getAllowedTransitions(TicketStatus.RESOLVED, Role.SUPPORT);
    expect(allowed).toContain(TicketStatus.CLOSED);
    expect(allowed).not.toContain(TicketStatus.IN_PROGRESS);
  });

  it("MANAGER from RESOLVED can close and reopen", () => {
    const allowed = getAllowedTransitions(TicketStatus.RESOLVED, Role.MANAGER);
    expect(allowed).toContain(TicketStatus.CLOSED);
    expect(allowed).toContain(TicketStatus.IN_PROGRESS);
  });

  it("MANAGER from CLOSED can reopen", () => {
    expect(getAllowedTransitions(TicketStatus.CLOSED, Role.MANAGER)).toContain(TicketStatus.OPEN);
  });

  it("SUPPORT from CLOSED sees no transitions", () => {
    expect(getAllowedTransitions(TicketStatus.CLOSED, Role.SUPPORT)).toEqual([]);
  });

  it("SUPER from IN_PROGRESS gets all MANAGER transitions (SUPER rank > MANAGER)", () => {
    const allowed = getAllowedTransitions(TicketStatus.IN_PROGRESS, Role.SUPER);
    expect(allowed).toContain(TicketStatus.ESCALATED);
    expect(allowed).toContain(TicketStatus.WAITING_ON_REQUESTER);
    expect(allowed).toContain(TicketStatus.RESOLVED);
  });

  it("SUPPORT from WAITING_ON_REQUESTER can return to IN_PROGRESS", () => {
    const allowed = getAllowedTransitions(TicketStatus.WAITING_ON_REQUESTER, Role.SUPPORT);
    expect(allowed).toEqual([TicketStatus.IN_PROGRESS]);
  });

  it("REQUESTER from WAITING_ON_REQUESTER sees no transitions", () => {
    expect(getAllowedTransitions(TicketStatus.WAITING_ON_REQUESTER, Role.REQUESTER)).toEqual([]);
  });

  it("MANAGER from ESCALATED can return to IN_PROGRESS", () => {
    const allowed = getAllowedTransitions(TicketStatus.ESCALATED, Role.MANAGER);
    expect(allowed).toEqual([TicketStatus.IN_PROGRESS]);
  });

  it("SUPPORT from ESCALATED sees no transitions", () => {
    expect(getAllowedTransitions(TicketStatus.ESCALATED, Role.SUPPORT)).toEqual([]);
  });

  it("REQUESTER from ESCALATED sees no transitions", () => {
    expect(getAllowedTransitions(TicketStatus.ESCALATED, Role.REQUESTER)).toEqual([]);
  });

  it("ADMIN from CLOSED can reopen (ADMIN rank > MANAGER)", () => {
    expect(getAllowedTransitions(TicketStatus.CLOSED, Role.ADMIN)).toContain(TicketStatus.OPEN);
  });

  it("getAllowedTransitions returns only valid targets — no duplicates", () => {
    const allowed = getAllowedTransitions(TicketStatus.IN_PROGRESS, Role.MANAGER);
    const unique = new Set(allowed);
    expect(allowed.length).toBe(unique.size);
  });
});
