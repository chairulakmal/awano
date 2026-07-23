import { vi, describe, it, expect, beforeEach } from "vitest";
import { Role } from "@/generated/prisma/enums";
import { AuthorizationError, type SessionPayload } from "@/lib/auth/assertions";

vi.mock("@/lib/db", () => ({
  db: {
    category: {
      findUnique: vi.fn(),
      findMany: vi.fn(),
      create: vi.fn(),
      delete: vi.fn(),
    },
  },
}));

import { db } from "@/lib/db";
import { listCategories, createCategory, deleteCategory } from "./service";

function session(overrides: Partial<SessionPayload> = {}): SessionPayload {
  return { userId: "manager-1", teamId: "team-a", role: Role.MANAGER, ...overrides };
}

beforeEach(() => {
  vi.clearAllMocks();
});

// ---------------------------------------------------------------------------
// listCategories: role guard
// ---------------------------------------------------------------------------

describe("listCategories: role guard", () => {
  it("throws when called by SUPPORT", async () => {
    await expect(listCategories(session({ role: Role.SUPPORT }))).rejects.toThrow(
      AuthorizationError
    );
    expect(db.category.findMany).not.toHaveBeenCalled();
  });

  it("throws when called by REQUESTER", async () => {
    await expect(listCategories(session({ role: Role.REQUESTER }))).rejects.toThrow(
      AuthorizationError
    );
  });

  it("allows MANAGER", async () => {
    vi.mocked(db.category.findMany).mockResolvedValue([] as never);
    await expect(listCategories(session({ role: Role.MANAGER }))).resolves.toEqual([]);
  });

  it("allows ADMIN", async () => {
    vi.mocked(db.category.findMany).mockResolvedValue([] as never);
    await expect(listCategories(session({ role: Role.ADMIN }))).resolves.toEqual([]);
  });
});

// ---------------------------------------------------------------------------
// createCategory: slug generation
// ---------------------------------------------------------------------------

describe("createCategory: slug generation", () => {
  beforeEach(() => {
    vi.mocked(db.category.create).mockResolvedValue({ id: "cat-1" } as never);
  });

  it("lowercases and hyphenates spaces", async () => {
    await createCategory({ name: "Hello World" }, session());
    expect(db.category.create).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ slug: "hello-world" }) })
    );
  });

  it("strips special characters, spaces become hyphens first then symbols are removed", async () => {
    // "C++ & Python" → lowercase → "c++ & python"
    //   → spaces→hyphens → "c++-&-python"
    //   → strip non-[a-z0-9-] → "c--python"
    await createCategory({ name: "C++ & Python" }, session());
    expect(db.category.create).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ slug: "c--python" }) })
    );
  });

  it("strips symbols with no surrounding spaces", async () => {
    await createCategory({ name: "billing/support" }, session());
    expect(db.category.create).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ slug: "billingsupport" }) })
    );
  });

  it("collapses multiple spaces into one hyphen", async () => {
    await createCategory({ name: "One  Two   Three" }, session());
    expect(db.category.create).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ slug: "one-two-three" }) })
    );
  });

  it("trims leading and trailing whitespace from the stored name", async () => {
    await createCategory({ name: "  Billing  " }, session());
    expect(db.category.create).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ name: "Billing" }) })
    );
  });

  it("scopes the category to the session's teamId", async () => {
    await createCategory({ name: "Infra" }, session({ teamId: "team-a" }));
    expect(db.category.create).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ teamId: "team-a" }) })
    );
  });

  it("throws before hitting the DB when name produces an empty slug", async () => {
    await expect(createCategory({ name: "@@@" }, session())).rejects.toThrow(
      "Name must produce a valid slug"
    );
    expect(db.category.create).not.toHaveBeenCalled();
  });

  it("throws on empty name (Zod min-1)", async () => {
    await expect(createCategory({ name: "" }, session())).rejects.toThrow();
    expect(db.category.create).not.toHaveBeenCalled();
  });

  it("role guard fires before slug logic: SUPPORT gets AuthorizationError", async () => {
    await expect(
      createCategory({ name: "Billing" }, session({ role: Role.SUPPORT }))
    ).rejects.toThrow(AuthorizationError);
    expect(db.category.create).not.toHaveBeenCalled();
  });
});

// ---------------------------------------------------------------------------
// deleteCategory
// ---------------------------------------------------------------------------

describe("deleteCategory: role guard", () => {
  it("throws when called by SUPPORT", async () => {
    await expect(deleteCategory("cat-1", session({ role: Role.SUPPORT }))).rejects.toThrow(
      AuthorizationError
    );
    expect(db.category.findUnique).not.toHaveBeenCalled();
  });
});

describe("deleteCategory: business rules", () => {
  it("throws AuthorizationError when category is not found", async () => {
    vi.mocked(db.category.findUnique).mockResolvedValue(null);
    await expect(deleteCategory("missing", session())).rejects.toThrow(AuthorizationError);
    expect(db.category.delete).not.toHaveBeenCalled();
  });

  it("throws on cross-team category", async () => {
    vi.mocked(db.category.findUnique).mockResolvedValue({
      id: "cat-1",
      teamId: "team-b",
      _count: { tickets: 0 },
    } as never);
    await expect(deleteCategory("cat-1", session({ teamId: "team-a" }))).rejects.toThrow(
      AuthorizationError
    );
    expect(db.category.delete).not.toHaveBeenCalled();
  });

  it("throws when category still has tickets", async () => {
    vi.mocked(db.category.findUnique).mockResolvedValue({
      id: "cat-1",
      teamId: "team-a",
      _count: { tickets: 3 },
    } as never);
    await expect(deleteCategory("cat-1", session())).rejects.toThrow(
      "Cannot delete a category that has tickets"
    );
    expect(db.category.delete).not.toHaveBeenCalled();
  });

  it("deletes when category is on the same team and has no tickets", async () => {
    vi.mocked(db.category.findUnique).mockResolvedValue({
      id: "cat-1",
      teamId: "team-a",
      _count: { tickets: 0 },
    } as never);
    vi.mocked(db.category.delete).mockResolvedValue({} as never);
    await deleteCategory("cat-1", session());
    expect(db.category.delete).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: "cat-1" } })
    );
  });
});
