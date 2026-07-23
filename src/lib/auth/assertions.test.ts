import { describe, it, expect } from "vitest";
import { Role } from "@/generated/prisma/enums";
import {
  assertAuthenticated,
  assertRole,
  assertSameTeam,
  assertCanViewTicket,
  assertCanUpdateTicket,
  AuthenticationError,
  AuthorizationError,
  type SessionPayload,
} from "./assertions";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makePayload(overrides: Partial<SessionPayload> = {}): SessionPayload {
  return {
    userId: "user-1",
    teamId: "team-a",
    role: Role.SUPPORT,
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// Error class properties
// ---------------------------------------------------------------------------

describe("AuthenticationError", () => {
  it("has status 401", () => {
    expect(new AuthenticationError().status).toBe(401);
  });

  it("has name AuthenticationError", () => {
    expect(new AuthenticationError().name).toBe("AuthenticationError");
  });

  it("is an instanceof Error", () => {
    expect(new AuthenticationError()).toBeInstanceOf(Error);
  });
});

describe("AuthorizationError", () => {
  it("has status 403", () => {
    expect(new AuthorizationError().status).toBe(403);
  });

  it("has name AuthorizationError", () => {
    expect(new AuthorizationError().name).toBe("AuthorizationError");
  });

  it("defaults to 'Forbidden' message", () => {
    expect(new AuthorizationError().message).toBe("Forbidden");
  });

  it("accepts a custom message", () => {
    expect(new AuthorizationError("Custom reason").message).toBe("Custom reason");
  });

  it("is an instanceof Error", () => {
    expect(new AuthorizationError()).toBeInstanceOf(Error);
  });
});

// ---------------------------------------------------------------------------
// assertAuthenticated
// ---------------------------------------------------------------------------

describe("assertAuthenticated", () => {
  it("throws 401 on null session", () => {
    expect(() => assertAuthenticated(null)).toThrow(AuthenticationError);
  });

  it("throws 401 when session has no user id", () => {
    expect(() =>
      assertAuthenticated({
        user: { id: "", role: Role.SUPPORT, teamId: "team-a" },
        expires: "",
      } as never)
    ).toThrow(AuthenticationError);
  });

  it("throws 401 when session has no role", () => {
    expect(() =>
      assertAuthenticated({
        user: { id: "user-1", role: null, teamId: "team-a" },
        expires: "",
      } as never)
    ).toThrow(AuthenticationError);
  });

  it("returns a typed payload on a valid session", () => {
    const session = {
      user: { id: "user-1", role: Role.MANAGER, teamId: "team-a", requesterType: undefined },
      expires: "2099-01-01",
    } as never;
    const payload = assertAuthenticated(session);
    expect(payload.userId).toBe("user-1");
    expect(payload.role).toBe(Role.MANAGER);
    expect(payload.teamId).toBe("team-a");
  });

  it("forwards requesterType when present", () => {
    const session = {
      user: { id: "user-1", role: Role.REQUESTER, teamId: "team-a", requesterType: "CUSTOMER" },
      expires: "2099-01-01",
    } as never;
    const payload = assertAuthenticated(session);
    expect(payload.requesterType).toBe("CUSTOMER");
  });

  it("SUPER session has null teamId", () => {
    const session = {
      user: { id: "super-1", role: Role.SUPER, teamId: null },
      expires: "2099-01-01",
    } as never;
    const payload = assertAuthenticated(session);
    expect(payload.teamId).toBeNull();
    expect(payload.role).toBe(Role.SUPER);
  });
});

// ---------------------------------------------------------------------------
// assertRole
// ---------------------------------------------------------------------------

describe("assertRole", () => {
  it("does not throw when role is in the allowed list", () => {
    const payload = makePayload({ role: Role.MANAGER });
    expect(() => assertRole(payload, [Role.MANAGER, Role.ADMIN])).not.toThrow();
  });

  it("throws 403 when role is not in the allowed list", () => {
    const payload = makePayload({ role: Role.SUPPORT });
    expect(() => assertRole(payload, [Role.MANAGER, Role.ADMIN])).toThrow(AuthorizationError);
  });

  it("SUPER is accepted when explicitly in the allowed list", () => {
    const payload = makePayload({ role: Role.SUPER, teamId: null });
    expect(() => assertRole(payload, [Role.SUPER])).not.toThrow();
  });

  it("SUPER is rejected when not in the allowed list", () => {
    const payload = makePayload({ role: Role.SUPER, teamId: null });
    expect(() => assertRole(payload, [Role.MANAGER])).toThrow(AuthorizationError);
  });

  it("REQUESTER is accepted when REQUESTER is in the list", () => {
    const payload = makePayload({ role: Role.REQUESTER, teamId: "team-a" });
    expect(() => assertRole(payload, [Role.REQUESTER])).not.toThrow();
  });

  it("throws AuthorizationError (not a generic Error)", () => {
    const payload = makePayload({ role: Role.SUPPORT });
    expect(() => assertRole(payload, [Role.MANAGER])).toThrow(AuthorizationError);
  });
});

// ---------------------------------------------------------------------------
// assertSameTeam
// ---------------------------------------------------------------------------

describe("assertSameTeam", () => {
  it("passes when teamId matches", () => {
    const payload = makePayload({ teamId: "team-a" });
    expect(() => assertSameTeam(payload, { teamId: "team-a" })).not.toThrow();
  });

  it("throws 403 on cross-team access", () => {
    const payload = makePayload({ teamId: "team-a" });
    expect(() => assertSameTeam(payload, { teamId: "team-b" })).toThrow(AuthorizationError);
  });

  it("MANAGER cross-team access is still blocked (only SUPER bypasses)", () => {
    const payload = makePayload({ role: Role.MANAGER, teamId: "team-a" });
    expect(() => assertSameTeam(payload, { teamId: "team-b" })).toThrow(AuthorizationError);
  });

  it("ADMIN cross-team access is still blocked", () => {
    const payload = makePayload({ role: Role.ADMIN, teamId: "team-a" });
    expect(() => assertSameTeam(payload, { teamId: "team-b" })).toThrow(AuthorizationError);
  });

  it("SUPER bypasses the team check", () => {
    const payload = makePayload({ role: Role.SUPER, teamId: null });
    expect(() => assertSameTeam(payload, { teamId: "team-b" })).not.toThrow();
  });

  it("error message mentions cross-team", () => {
    const payload = makePayload({ teamId: "team-a" });
    expect(() => assertSameTeam(payload, { teamId: "team-b" })).toThrow(/cross-team/i);
  });
});

// ---------------------------------------------------------------------------
// assertCanViewTicket
// ---------------------------------------------------------------------------

describe("assertCanViewTicket", () => {
  it("SUPPORT can view any ticket on their team", () => {
    const payload = makePayload({ role: Role.SUPPORT, teamId: "team-a" });
    const ticket = { teamId: "team-a", createdById: "user-other" };
    expect(() => assertCanViewTicket(payload, ticket)).not.toThrow();
  });

  it("MANAGER can view any ticket on their team", () => {
    const payload = makePayload({ role: Role.MANAGER, teamId: "team-a" });
    const ticket = { teamId: "team-a", createdById: "user-other" };
    expect(() => assertCanViewTicket(payload, ticket)).not.toThrow();
  });

  it("ADMIN can view any ticket on their team", () => {
    const payload = makePayload({ role: Role.ADMIN, teamId: "team-a" });
    const ticket = { teamId: "team-a", createdById: "user-other" };
    expect(() => assertCanViewTicket(payload, ticket)).not.toThrow();
  });

  it("REQUESTER can view their own ticket", () => {
    const payload = makePayload({ role: Role.REQUESTER, userId: "user-1", teamId: "team-a" });
    const ticket = { teamId: "team-a", createdById: "user-1" };
    expect(() => assertCanViewTicket(payload, ticket)).not.toThrow();
  });

  it("REQUESTER cannot view another requester's ticket", () => {
    const payload = makePayload({ role: Role.REQUESTER, userId: "user-1", teamId: "team-a" });
    const ticket = { teamId: "team-a", createdById: "user-2" };
    expect(() => assertCanViewTicket(payload, ticket)).toThrow(AuthorizationError);
  });

  it("REQUESTER error message mentions own tickets", () => {
    const payload = makePayload({ role: Role.REQUESTER, userId: "user-1", teamId: "team-a" });
    const ticket = { teamId: "team-a", createdById: "user-2" };
    expect(() => assertCanViewTicket(payload, ticket)).toThrow(/own ticket/i);
  });

  it("REQUESTER cannot view a ticket from a different team even if same userId", () => {
    const payload = makePayload({ role: Role.REQUESTER, userId: "user-1", teamId: "team-a" });
    const ticket = { teamId: "team-b", createdById: "user-1" };
    expect(() => assertCanViewTicket(payload, ticket)).toThrow(AuthorizationError);
  });

  it("SUPPORT cannot view a ticket from a different team", () => {
    const payload = makePayload({ role: Role.SUPPORT, teamId: "team-a" });
    const ticket = { teamId: "team-b", createdById: "user-other" };
    expect(() => assertCanViewTicket(payload, ticket)).toThrow(AuthorizationError);
  });

  it("SUPER can view tickets from any team", () => {
    const payload = makePayload({ role: Role.SUPER, teamId: null });
    const ticket = { teamId: "team-b", createdById: "user-2" };
    expect(() => assertCanViewTicket(payload, ticket)).not.toThrow();
  });
});

// ---------------------------------------------------------------------------
// assertCanUpdateTicket
// ---------------------------------------------------------------------------

describe("assertCanUpdateTicket", () => {
  it("SUPPORT can update a ticket on their team", () => {
    const payload = makePayload({ role: Role.SUPPORT, teamId: "team-a" });
    const ticket = { teamId: "team-a", createdById: "user-1" };
    expect(() => assertCanUpdateTicket(payload, ticket)).not.toThrow();
  });

  it("MANAGER can update a ticket on their team", () => {
    const payload = makePayload({ role: Role.MANAGER, teamId: "team-a" });
    const ticket = { teamId: "team-a", createdById: "user-1" };
    expect(() => assertCanUpdateTicket(payload, ticket)).not.toThrow();
  });

  it("ADMIN can update a ticket on their team", () => {
    const payload = makePayload({ role: Role.ADMIN, teamId: "team-a" });
    const ticket = { teamId: "team-a", createdById: "user-1" };
    expect(() => assertCanUpdateTicket(payload, ticket)).not.toThrow();
  });

  it("REQUESTER cannot update ticket fields even for their own ticket", () => {
    const payload = makePayload({ role: Role.REQUESTER, userId: "user-1", teamId: "team-a" });
    const ticket = { teamId: "team-a", createdById: "user-1" };
    expect(() => assertCanUpdateTicket(payload, ticket)).toThrow(AuthorizationError);
  });

  it("REQUESTER error message mentions cannot update", () => {
    const payload = makePayload({ role: Role.REQUESTER, userId: "user-1", teamId: "team-a" });
    const ticket = { teamId: "team-a", createdById: "user-1" };
    expect(() => assertCanUpdateTicket(payload, ticket)).toThrow(/cannot update/i);
  });

  it("throws 403 on cross-team update attempt", () => {
    const payload = makePayload({ role: Role.SUPPORT, teamId: "team-a" });
    const ticket = { teamId: "team-b", createdById: "user-1" };
    expect(() => assertCanUpdateTicket(payload, ticket)).toThrow(AuthorizationError);
  });

  it("cross-team check fires before role check: REQUESTER on wrong team still gets AuthorizationError", () => {
    const payload = makePayload({ role: Role.REQUESTER, userId: "user-1", teamId: "team-a" });
    const ticket = { teamId: "team-b", createdById: "user-1" };
    expect(() => assertCanUpdateTicket(payload, ticket)).toThrow(AuthorizationError);
  });
});
