import { vi, describe, it, expect, beforeEach } from "vitest";
import { Role } from "@/generated/prisma/enums";
import { AuthorizationError, type SessionPayload } from "@/lib/auth/assertions";

vi.mock("@/lib/db", () => ({
  db: {
    user: {
      findUnique: vi.fn(),
      findMany: vi.fn(),
      update: vi.fn(),
    },
  },
}));

import { db } from "@/lib/db";
import { listTeamMembers, listTeamUsers, changeUserRole } from "./service";

function session(overrides: Partial<SessionPayload> = {}): SessionPayload {
  return { userId: "admin-1", teamId: "team-a", role: Role.ADMIN, ...overrides };
}

beforeEach(() => {
  vi.clearAllMocks();
});

// ---------------------------------------------------------------------------
// Role guards
// ---------------------------------------------------------------------------

describe("listTeamMembers — role guard", () => {
  it("throws when called by REQUESTER", async () => {
    await expect(listTeamMembers(session({ role: Role.REQUESTER }))).rejects.toThrow(
      AuthorizationError
    );
    expect(db.user.findMany).not.toHaveBeenCalled();
  });

  it("allows SUPPORT", async () => {
    vi.mocked(db.user.findMany).mockResolvedValue([] as never);
    await expect(listTeamMembers(session({ role: Role.SUPPORT }))).resolves.toEqual([]);
  });
});

describe("listTeamUsers — role guard", () => {
  it("throws when called by SUPPORT", async () => {
    await expect(listTeamUsers(session({ role: Role.SUPPORT }))).rejects.toThrow(
      AuthorizationError
    );
    expect(db.user.findMany).not.toHaveBeenCalled();
  });

  it("allows MANAGER", async () => {
    vi.mocked(db.user.findMany).mockResolvedValue([] as never);
    await expect(listTeamUsers(session({ role: Role.MANAGER }))).resolves.toEqual([]);
  });
});

// ---------------------------------------------------------------------------
// changeUserRole
// ---------------------------------------------------------------------------

describe("changeUserRole — role guard", () => {
  it("throws when called by REQUESTER", async () => {
    await expect(
      changeUserRole("user-x", Role.SUPPORT, session({ role: Role.REQUESTER }))
    ).rejects.toThrow(AuthorizationError);
  });

  it("throws when called by SUPPORT", async () => {
    await expect(
      changeUserRole("user-x", Role.SUPPORT, session({ role: Role.SUPPORT }))
    ).rejects.toThrow(AuthorizationError);
  });
});

describe("changeUserRole — self-edit guard", () => {
  it("throws when the actor tries to change their own role", async () => {
    const s = session({ userId: "admin-1" });
    await expect(changeUserRole("admin-1", Role.SUPPORT, s)).rejects.toThrow(AuthorizationError);
    expect(db.user.findUnique).not.toHaveBeenCalled();
  });

  it("error message mentions cannot change own role", async () => {
    const s = session({ userId: "admin-1" });
    await expect(changeUserRole("admin-1", Role.SUPPORT, s)).rejects.toThrow(/own role/i);
  });
});

describe("changeUserRole — SUPER role guard", () => {
  it("throws when trying to assign the SUPER role", async () => {
    await expect(changeUserRole("user-x", Role.SUPER, session())).rejects.toThrow(
      AuthorizationError
    );
    expect(db.user.findUnique).not.toHaveBeenCalled();
  });
});

describe("changeUserRole — cross-team guard", () => {
  it("throws when the target user belongs to a different team", async () => {
    vi.mocked(db.user.findUnique).mockResolvedValue({
      teamId: "team-b",
      role: Role.SUPPORT,
      requesterType: null,
    } as never);
    const s = session({ teamId: "team-a" });
    await expect(changeUserRole("user-x", Role.SUPPORT, s)).rejects.toThrow(AuthorizationError);
    expect(db.user.update).not.toHaveBeenCalled();
  });
});

describe("changeUserRole — success path", () => {
  it("updates the user's role and clears requesterType for non-REQUESTER", async () => {
    vi.mocked(db.user.findUnique).mockResolvedValue({
      teamId: "team-a",
      role: Role.REQUESTER,
      requesterType: "CUSTOMER",
    } as never);
    vi.mocked(db.user.update).mockResolvedValue({} as never);
    await changeUserRole("user-x", Role.SUPPORT, session({ teamId: "team-a" }));
    expect(db.user.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ role: Role.SUPPORT, requesterType: null }),
      })
    );
  });

  it("preserves requesterType (defaults CUSTOMER) when new role is REQUESTER", async () => {
    vi.mocked(db.user.findUnique).mockResolvedValue({
      teamId: "team-a",
      role: Role.SUPPORT,
      requesterType: null,
    } as never);
    vi.mocked(db.user.update).mockResolvedValue({} as never);
    await changeUserRole("user-x", Role.REQUESTER, session({ teamId: "team-a" }));
    expect(db.user.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ role: Role.REQUESTER, requesterType: "CUSTOMER" }),
      })
    );
  });

  it("throws when target user is not found", async () => {
    vi.mocked(db.user.findUnique).mockResolvedValue(null);
    await expect(changeUserRole("user-x", Role.SUPPORT, session())).rejects.toThrow(
      AuthorizationError
    );
  });
});
