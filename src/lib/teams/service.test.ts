import { vi, describe, it, expect, beforeEach } from "vitest";
import { Role } from "@/generated/prisma/enums";
import { AuthorizationError, type SessionPayload } from "@/lib/auth/assertions";

vi.mock("@/lib/db", () => ({
  db: {
    team: {
      findMany: vi.fn(),
      findUnique: vi.fn(),
      create: vi.fn(),
    },
    user: {
      create: vi.fn(),
    },
  },
}));

vi.mock("bcryptjs", () => ({
  default: {
    hash: vi.fn(),
  },
}));

import { db } from "@/lib/db";
import bcrypt from "bcryptjs";
import { listTeams, createTeam, getTeamDetail, createUserInTeam, seedDemoUsers } from "./service";

function superSession(overrides: Partial<SessionPayload> = {}): SessionPayload {
  return { userId: "super-1", teamId: null, role: Role.SUPER, ...overrides };
}

beforeEach(() => {
  vi.clearAllMocks();
});

// ---------------------------------------------------------------------------
// listTeams
// ---------------------------------------------------------------------------

describe("listTeams: role guard", () => {
  it("throws when called by MANAGER", async () => {
    await expect(listTeams(superSession({ role: Role.MANAGER }))).rejects.toThrow(
      AuthorizationError
    );
    expect(db.team.findMany).not.toHaveBeenCalled();
  });

  it("throws when called by ADMIN", async () => {
    await expect(listTeams(superSession({ role: Role.ADMIN }))).rejects.toThrow(AuthorizationError);
  });

  it("allows SUPER", async () => {
    vi.mocked(db.team.findMany).mockResolvedValue([] as never);
    await expect(listTeams(superSession())).resolves.toEqual([]);
  });
});

// ---------------------------------------------------------------------------
// createTeam
// ---------------------------------------------------------------------------

describe("createTeam: role guard", () => {
  it("throws when called by ADMIN", async () => {
    await expect(createTeam({ name: "X", slug: "x" }, superSession({ role: Role.ADMIN }))).rejects.toThrow(
      AuthorizationError
    );
    expect(db.team.create).not.toHaveBeenCalled();
  });
});

describe("createTeam: Zod validation", () => {
  it("throws on empty name", async () => {
    await expect(createTeam({ name: "", slug: "valid-slug" }, superSession())).rejects.toThrow();
    expect(db.team.create).not.toHaveBeenCalled();
  });

  it("throws on invalid slug characters (uppercase)", async () => {
    await expect(createTeam({ name: "Team", slug: "Team-A" }, superSession())).rejects.toThrow();
    expect(db.team.create).not.toHaveBeenCalled();
  });

  it("throws on invalid slug characters (spaces)", async () => {
    await expect(createTeam({ name: "Team", slug: "team a" }, superSession())).rejects.toThrow();
    expect(db.team.create).not.toHaveBeenCalled();
  });

  it("accepts a valid lowercase-hyphenated slug", async () => {
    vi.mocked(db.team.create).mockResolvedValue({ id: "team-1" } as never);
    await expect(createTeam({ name: "Team A", slug: "team-a" }, superSession())).resolves.not.toThrow();
  });
});

describe("createTeam: duplicate slug", () => {
  it("throws a friendly error on P2002 unique constraint violation", async () => {
    vi.mocked(db.team.create).mockRejectedValue({ code: "P2002" });
    await expect(createTeam({ name: "Team A", slug: "team-a" }, superSession())).rejects.toThrow(
      "A team with this slug already exists"
    );
  });
});

describe("createTeam: success path", () => {
  it("creates team with provided name, slug, and notes", async () => {
    vi.mocked(db.team.create).mockResolvedValue({ id: "team-1" } as never);
    await createTeam({ name: "Acme", slug: "acme", notes: "Test org" }, superSession());
    expect(db.team.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: { name: "Acme", slug: "acme", notes: "Test org" },
      })
    );
  });
});

// ---------------------------------------------------------------------------
// getTeamDetail
// ---------------------------------------------------------------------------

describe("getTeamDetail: role guard", () => {
  it("throws when called by MANAGER", async () => {
    await expect(getTeamDetail("team-1", superSession({ role: Role.MANAGER }))).rejects.toThrow(
      AuthorizationError
    );
    expect(db.team.findUnique).not.toHaveBeenCalled();
  });
});

describe("getTeamDetail: not found", () => {
  it("throws when team does not exist", async () => {
    vi.mocked(db.team.findUnique).mockResolvedValue(null);
    await expect(getTeamDetail("missing", superSession())).rejects.toThrow("Team not found");
  });
});

describe("getTeamDetail: success path", () => {
  it("returns the team when found", async () => {
    const team = { id: "team-1", name: "Acme", users: [], _count: { tickets: 0 } };
    vi.mocked(db.team.findUnique).mockResolvedValue(team as never);
    const result = await getTeamDetail("team-1", superSession());
    expect(result).toBe(team);
  });
});

// ---------------------------------------------------------------------------
// createUserInTeam
// ---------------------------------------------------------------------------

describe("createUserInTeam: role guard", () => {
  it("throws when called by ADMIN", async () => {
    await expect(
      createUserInTeam("team-1", {}, superSession({ role: Role.ADMIN }))
    ).rejects.toThrow(AuthorizationError);
    expect(db.user.create).not.toHaveBeenCalled();
  });
});

describe("createUserInTeam: Zod validation", () => {
  it("throws on invalid email", async () => {
    await expect(
      createUserInTeam(
        "team-1",
        { name: "Alice", email: "not-an-email", password: "password123", role: "REQUESTER" },
        superSession()
      )
    ).rejects.toThrow();
    expect(db.user.create).not.toHaveBeenCalled();
  });

  it("throws on password shorter than 8 characters", async () => {
    await expect(
      createUserInTeam(
        "team-1",
        { name: "Alice", email: "alice@example.com", password: "short", role: "REQUESTER" },
        superSession()
      )
    ).rejects.toThrow();
    expect(db.user.create).not.toHaveBeenCalled();
  });

  it("throws on invalid role", async () => {
    await expect(
      createUserInTeam(
        "team-1",
        { name: "Alice", email: "alice@example.com", password: "password123", role: "SUPER" },
        superSession()
      )
    ).rejects.toThrow();
    expect(db.user.create).not.toHaveBeenCalled();
  });
});

describe("createUserInTeam: success path", () => {
  it("hashes the password before storing", async () => {
    vi.mocked(bcrypt.hash).mockResolvedValue("hashed-pw" as never);
    vi.mocked(db.user.create).mockResolvedValue({} as never);
    await createUserInTeam(
      "team-1",
      { name: "Alice", email: "alice@example.com", password: "password123", role: "SUPPORT" },
      superSession()
    );
    expect(bcrypt.hash).toHaveBeenCalledWith("password123", 12);
    expect(db.user.create).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ passwordHash: "hashed-pw" }) })
    );
  });

  it("defaults requesterType to CUSTOMER when role is REQUESTER and none provided", async () => {
    vi.mocked(bcrypt.hash).mockResolvedValue("hashed-pw" as never);
    vi.mocked(db.user.create).mockResolvedValue({} as never);
    await createUserInTeam(
      "team-1",
      { name: "Alice", email: "alice@example.com", password: "password123", role: "REQUESTER" },
      superSession()
    );
    expect(db.user.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ requesterType: "CUSTOMER" }),
      })
    );
  });

  it("sets requesterType to null for non-REQUESTER roles", async () => {
    vi.mocked(bcrypt.hash).mockResolvedValue("hashed-pw" as never);
    vi.mocked(db.user.create).mockResolvedValue({} as never);
    await createUserInTeam(
      "team-1",
      { name: "Dan", email: "dan@example.com", password: "password123", role: "SUPPORT" },
      superSession()
    );
    expect(db.user.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ requesterType: null }),
      })
    );
  });

  it("scopes user to the provided teamId", async () => {
    vi.mocked(bcrypt.hash).mockResolvedValue("hashed-pw" as never);
    vi.mocked(db.user.create).mockResolvedValue({} as never);
    await createUserInTeam(
      "team-xyz",
      { name: "Dan", email: "dan@example.com", password: "password123", role: "SUPPORT" },
      superSession()
    );
    expect(db.user.create).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ teamId: "team-xyz" }) })
    );
  });

  it("throws a friendly error on duplicate email within team (P2002)", async () => {
    vi.mocked(bcrypt.hash).mockResolvedValue("hashed-pw" as never);
    vi.mocked(db.user.create).mockRejectedValue({ code: "P2002" });
    await expect(
      createUserInTeam(
        "team-1",
        { name: "Alice", email: "alice@example.com", password: "password123", role: "SUPPORT" },
        superSession()
      )
    ).rejects.toThrow("A user with this email already exists in this team");
  });
});

// ---------------------------------------------------------------------------
// seedDemoUsers
// ---------------------------------------------------------------------------

describe("seedDemoUsers: role guard", () => {
  it("throws when called by MANAGER", async () => {
    await expect(seedDemoUsers("team-1", superSession({ role: Role.MANAGER }))).rejects.toThrow(
      AuthorizationError
    );
  });
});

describe("seedDemoUsers: team not found", () => {
  it("throws when team does not exist", async () => {
    vi.mocked(db.team.findUnique).mockResolvedValue(null);
    await expect(seedDemoUsers("missing", superSession())).rejects.toThrow("Team not found");
    expect(db.user.create).not.toHaveBeenCalled();
  });
});

describe("seedDemoUsers: success path", () => {
  it("creates 5 demo users and returns correct count", async () => {
    vi.mocked(db.team.findUnique).mockResolvedValue({ slug: "acme" } as never);
    vi.mocked(bcrypt.hash).mockResolvedValue("hashed-pw" as never);
    vi.mocked(db.user.create).mockResolvedValue({} as never);

    const result = await seedDemoUsers("team-1", superSession());
    expect(result.created).toBe(5);
    expect(result.total).toBe(5);
    expect(db.user.create).toHaveBeenCalledTimes(5);
  });

  it("uses team slug in generated email addresses", async () => {
    vi.mocked(db.team.findUnique).mockResolvedValue({ slug: "acme" } as never);
    vi.mocked(bcrypt.hash).mockResolvedValue("hashed-pw" as never);
    vi.mocked(db.user.create).mockResolvedValue({} as never);

    await seedDemoUsers("team-1", superSession());

    const emails = vi.mocked(db.user.create).mock.calls.map(
      (call) => (call[0] as { data: { email: string } }).data.email
    );
    expect(emails).toEqual(
      expect.arrayContaining([
        "customer@acme.demo",
        "recruiter@acme.demo",
        "agent@acme.demo",
        "support@acme.demo",
        "manager@acme.demo",
      ])
    );
  });

  it("skips already-existing users and reports partial count", async () => {
    vi.mocked(db.team.findUnique).mockResolvedValue({ slug: "acme" } as never);
    vi.mocked(bcrypt.hash).mockResolvedValue("hashed-pw" as never);
    // First 2 succeed, rest throw P2002 (already exist)
    vi.mocked(db.user.create)
      .mockResolvedValueOnce({} as never)
      .mockResolvedValueOnce({} as never)
      .mockRejectedValue({ code: "P2002" });

    const result = await seedDemoUsers("team-1", superSession());
    expect(result.created).toBe(2);
    expect(result.total).toBe(5);
  });
});
