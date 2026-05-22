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

vi.mock("bcryptjs", () => ({
  default: {
    compare: vi.fn(),
    hash: vi.fn(),
  },
}));

import { db } from "@/lib/db";
import bcrypt from "bcryptjs";
import { listTeamMembers, listTeamUsers, changeUserRole, changeMyPassword } from "./service";

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

describe("listTeamMembers — teamId scoping", () => {
  it("scopes query to session teamId", async () => {
    vi.mocked(db.user.findMany).mockResolvedValue([] as never);
    await listTeamMembers(session({ teamId: "team-a" }));
    expect(db.user.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: expect.objectContaining({ teamId: "team-a" }) })
    );
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

describe("listTeamUsers — teamId scoping", () => {
  it("scopes query to session teamId", async () => {
    vi.mocked(db.user.findMany).mockResolvedValue([] as never);
    await listTeamUsers(session({ teamId: "team-a" }));
    expect(db.user.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: expect.objectContaining({ teamId: "team-a" }) })
    );
  });
});

// ---------------------------------------------------------------------------
// changeUserRole
// ---------------------------------------------------------------------------

describe("changeUserRole — role guard", () => {
  it("throws when called by REQUESTER", async () => {
    await expect(
      changeUserRole("user-x", Role.SUPPORT, null, session({ role: Role.REQUESTER }))
    ).rejects.toThrow(AuthorizationError);
  });

  it("throws when called by SUPPORT", async () => {
    await expect(
      changeUserRole("user-x", Role.SUPPORT, null, session({ role: Role.SUPPORT }))
    ).rejects.toThrow(AuthorizationError);
  });
});

describe("changeUserRole — self-edit guard", () => {
  it("throws when the actor tries to change their own role", async () => {
    const s = session({ userId: "admin-1" });
    await expect(changeUserRole("admin-1", Role.SUPPORT, null, s)).rejects.toThrow(AuthorizationError);
    expect(db.user.findUnique).not.toHaveBeenCalled();
  });

  it("error message mentions cannot change own role", async () => {
    const s = session({ userId: "admin-1" });
    await expect(changeUserRole("admin-1", Role.SUPPORT, null, s)).rejects.toThrow(/own role/i);
  });
});

describe("changeUserRole — SUPER role guard", () => {
  it("throws when trying to assign the SUPER role", async () => {
    await expect(changeUserRole("user-x", Role.SUPER, null, session())).rejects.toThrow(
      AuthorizationError
    );
    expect(db.user.findUnique).not.toHaveBeenCalled();
  });
});

describe("changeUserRole — role escalation guard", () => {
  it("throws when MANAGER tries to assign MANAGER", async () => {
    await expect(
      changeUserRole("user-x", Role.MANAGER, null, session({ role: Role.MANAGER }))
    ).rejects.toThrow(AuthorizationError);
    expect(db.user.findUnique).not.toHaveBeenCalled();
  });

  it("throws when ADMIN tries to assign ADMIN", async () => {
    await expect(
      changeUserRole("user-x", Role.ADMIN, null, session({ role: Role.ADMIN }))
    ).rejects.toThrow(AuthorizationError);
    expect(db.user.findUnique).not.toHaveBeenCalled();
  });

  it("allows ADMIN to assign MANAGER", async () => {
    vi.mocked(db.user.findUnique).mockResolvedValue({
      teamId: "team-a",
      role: Role.SUPPORT,
      requesterType: null,
    } as never);
    vi.mocked(db.user.update).mockResolvedValue({} as never);
    await expect(
      changeUserRole("user-x", Role.MANAGER, null, session({ role: Role.ADMIN }))
    ).resolves.not.toThrow();
  });
});

describe("changeUserRole — target rank guard", () => {
  it("throws when MANAGER tries to demote an ADMIN", async () => {
    vi.mocked(db.user.findUnique).mockResolvedValue({
      teamId: "team-a",
      role: Role.ADMIN,
      requesterType: null,
    } as never);
    await expect(
      changeUserRole("user-x", Role.SUPPORT, null, session({ role: Role.MANAGER }))
    ).rejects.toThrow(AuthorizationError);
    expect(db.user.update).not.toHaveBeenCalled();
  });

  it("throws when MANAGER tries to demote a MANAGER", async () => {
    vi.mocked(db.user.findUnique).mockResolvedValue({
      teamId: "team-a",
      role: Role.MANAGER,
      requesterType: null,
    } as never);
    await expect(
      changeUserRole("user-x", Role.SUPPORT, null, session({ role: Role.MANAGER }))
    ).rejects.toThrow(AuthorizationError);
    expect(db.user.update).not.toHaveBeenCalled();
  });

  it("throws when ADMIN tries to modify another ADMIN", async () => {
    vi.mocked(db.user.findUnique).mockResolvedValue({
      teamId: "team-a",
      role: Role.ADMIN,
      requesterType: null,
    } as never);
    await expect(
      changeUserRole("user-x", Role.MANAGER, null, session({ role: Role.ADMIN }))
    ).rejects.toThrow(AuthorizationError);
    expect(db.user.update).not.toHaveBeenCalled();
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
    await expect(changeUserRole("user-x", Role.SUPPORT, null, s)).rejects.toThrow(AuthorizationError);
    expect(db.user.update).not.toHaveBeenCalled();
  });
});

describe("changeUserRole — promotion path", () => {
  it("throws when promoting CUSTOMER requester directly to SUPPORT", async () => {
    vi.mocked(db.user.findUnique).mockResolvedValue({
      teamId: "team-a",
      role: Role.REQUESTER,
      requesterType: "CUSTOMER",
    } as never);
    await expect(
      changeUserRole("user-x", Role.SUPPORT, null, session())
    ).rejects.toThrow(AuthorizationError);
    expect(db.user.update).not.toHaveBeenCalled();
  });

  it("throws when promoting RECRUITER requester directly to SUPPORT", async () => {
    vi.mocked(db.user.findUnique).mockResolvedValue({
      teamId: "team-a",
      role: Role.REQUESTER,
      requesterType: "RECRUITER",
    } as never);
    await expect(
      changeUserRole("user-x", Role.SUPPORT, null, session())
    ).rejects.toThrow(AuthorizationError);
    expect(db.user.update).not.toHaveBeenCalled();
  });

  it("allows FIELD_AGENT requester to be promoted to SUPPORT", async () => {
    vi.mocked(db.user.findUnique).mockResolvedValue({
      teamId: "team-a",
      role: Role.REQUESTER,
      requesterType: "FIELD_AGENT",
    } as never);
    vi.mocked(db.user.update).mockResolvedValue({} as never);
    await expect(
      changeUserRole("user-x", Role.SUPPORT, null, session())
    ).resolves.not.toThrow();
  });
});

describe("changeUserRole — success path", () => {
  it("promotes FIELD_AGENT requester to SUPPORT and clears requesterType", async () => {
    vi.mocked(db.user.findUnique).mockResolvedValue({
      teamId: "team-a",
      role: Role.REQUESTER,
      requesterType: "FIELD_AGENT",
    } as never);
    vi.mocked(db.user.update).mockResolvedValue({} as never);
    await changeUserRole("user-x", Role.SUPPORT, null, session({ teamId: "team-a" }));
    expect(db.user.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ role: Role.SUPPORT, requesterType: null }),
      })
    );
  });

  it("uses explicit requesterType when changing requester type", async () => {
    vi.mocked(db.user.findUnique).mockResolvedValue({
      teamId: "team-a",
      role: Role.REQUESTER,
      requesterType: "CUSTOMER",
    } as never);
    vi.mocked(db.user.update).mockResolvedValue({} as never);
    await changeUserRole("user-x", Role.REQUESTER, "FIELD_AGENT", session({ teamId: "team-a" }));
    expect(db.user.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ role: Role.REQUESTER, requesterType: "FIELD_AGENT" }),
      })
    );
  });

  it("defaults requesterType to CUSTOMER when demoting to REQUESTER without explicit type", async () => {
    vi.mocked(db.user.findUnique).mockResolvedValue({
      teamId: "team-a",
      role: Role.SUPPORT,
      requesterType: null,
    } as never);
    vi.mocked(db.user.update).mockResolvedValue({} as never);
    await changeUserRole("user-x", Role.REQUESTER, null, session({ teamId: "team-a" }));
    expect(db.user.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ role: Role.REQUESTER, requesterType: "CUSTOMER" }),
      })
    );
  });

  it("throws when target user is not found", async () => {
    vi.mocked(db.user.findUnique).mockResolvedValue(null);
    await expect(changeUserRole("user-x", Role.SUPPORT, null, session())).rejects.toThrow(
      AuthorizationError
    );
  });
});

// ---------------------------------------------------------------------------
// changeMyPassword
// ---------------------------------------------------------------------------

describe("changeMyPassword — user not found", () => {
  it("throws AuthorizationError when findUnique returns null", async () => {
    vi.mocked(db.user.findUnique).mockResolvedValue(null);
    await expect(changeMyPassword("old-pass", "new-pass-fifteen-chars", session())).rejects.toThrow(
      AuthorizationError
    );
    expect(bcrypt.compare).not.toHaveBeenCalled();
    expect(db.user.update).not.toHaveBeenCalled();
  });
});

describe("changeMyPassword — wrong current password", () => {
  it("throws AuthorizationError when bcrypt.compare returns false", async () => {
    vi.mocked(db.user.findUnique).mockResolvedValue({ passwordHash: "stored-hash" } as never);
    vi.mocked(bcrypt.compare).mockResolvedValue(false as never);
    await expect(
      changeMyPassword("wrong-pass", "new-pass-fifteen-chars", session())
    ).rejects.toThrow(/invalid credentials/i);
    expect(db.user.update).not.toHaveBeenCalled();
  });
});

describe("changeMyPassword — success", () => {
  it("hashes the new password and saves it", async () => {
    vi.mocked(db.user.findUnique).mockResolvedValue({ passwordHash: "stored-hash" } as never);
    vi.mocked(bcrypt.compare).mockResolvedValue(true as never);
    vi.mocked(bcrypt.hash).mockResolvedValue("hashed-new-pass" as never);
    vi.mocked(db.user.update).mockResolvedValue({} as never);

    await changeMyPassword("correct-pass", "new-pass-fifteen-chars", session());

    expect(bcrypt.compare).toHaveBeenCalledWith("correct-pass", "stored-hash");
    expect(bcrypt.hash).toHaveBeenCalledWith("new-pass-fifteen-chars", 12);
    expect(db.user.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: "admin-1" },
        data: { passwordHash: "hashed-new-pass" },
      })
    );
  });

  it("looks up the user by session.userId, not a caller-supplied id", async () => {
    vi.mocked(db.user.findUnique).mockResolvedValue({ passwordHash: "stored-hash" } as never);
    vi.mocked(bcrypt.compare).mockResolvedValue(true as never);
    vi.mocked(bcrypt.hash).mockResolvedValue("hashed-new-pass" as never);
    vi.mocked(db.user.update).mockResolvedValue({} as never);

    await changeMyPassword(
      "correct-pass",
      "new-pass-fifteen-chars",
      session({ userId: "user-42" })
    );

    expect(db.user.findUnique).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: "user-42" } })
    );
    expect(db.user.update).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: "user-42" } })
    );
  });
});
