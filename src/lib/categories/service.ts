import { z } from "zod";
import { db } from "@/lib/db";
import { assertRole, assertSameTeam, AuthorizationError, type SessionPayload } from "@/lib/auth/assertions";

export async function listCategories(session: SessionPayload) {
  assertRole(session, ["MANAGER", "ADMIN"]);
  return db.category.findMany({
    where:   { teamId: session.teamId! },
    include: { _count: { select: { tickets: true } } },
    orderBy: { name: "asc" },
  });
}

export async function createCategory(input: unknown, session: SessionPayload) {
  assertRole(session, ["MANAGER", "ADMIN"]);
  const { name } = z.object({ name: z.string().min(1).max(100) }).parse(input);
  const slug = name.toLowerCase().trim().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "");
  if (!slug) throw new Error("Name must produce a valid slug");

  try {
    return await db.category.create({
      data: { teamId: session.teamId!, name: name.trim(), slug },
    });
  } catch (err: unknown) {
    if ((err as { code?: string }).code === "P2002") {
      throw new Error("A category with that name already exists");
    }
    throw err;
  }
}

export async function deleteCategory(id: string, session: SessionPayload) {
  assertRole(session, ["MANAGER", "ADMIN"]);
  const category = await db.category.findUnique({
    where:   { id },
    include: { _count: { select: { tickets: true } } },
  });
  if (!category) throw new AuthorizationError("Category not found");
  assertSameTeam(session, category);
  if (category._count.tickets > 0) throw new Error("Cannot delete a category that has tickets");
  return db.category.delete({ where: { id } });
}
