"use server";

import { z } from "zod";
import { auth } from "@/auth";
import { assertAuthenticated } from "@/lib/auth/assertions";
import { changeMyPassword } from "@/lib/users/service";

const schema = z
  .object({
    currentPassword: z.string().min(1),
    newPassword: z.string().min(15, "New password must be at least 15 characters"),
    confirmPassword: z.string(),
  })
  .refine((d) => d.newPassword === d.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  });

export type ChangePasswordState = { ok: boolean; message: string } | null;

// In-process sliding-window rate limiter keyed on userId.
// Sufficient for a single Railway replica; swap for Upstash Redis if horizontal scaling lands.
const rateLimitStore = new Map<string, { count: number; windowStart: number }>();
const WINDOW_MS = 15 * 60 * 1000;
const MAX_ATTEMPTS = 5;

function checkRateLimit(userId: string): boolean {
  const now = Date.now();
  const entry = rateLimitStore.get(userId);
  if (!entry || now - entry.windowStart > WINDOW_MS) {
    rateLimitStore.set(userId, { count: 1, windowStart: now });
    return true;
  }
  if (entry.count >= MAX_ATTEMPTS) return false;
  entry.count++;
  return true;
}

function resetRateLimit(userId: string) {
  rateLimitStore.delete(userId);
}

export async function changePasswordAction(
  _prev: ChangePasswordState,
  formData: FormData
): Promise<ChangePasswordState> {
  try {
    const parsed = schema.safeParse({
      currentPassword: formData.get("currentPassword"),
      newPassword: formData.get("newPassword"),
      confirmPassword: formData.get("confirmPassword"),
    });
    if (!parsed.success) return { ok: false, message: parsed.error.issues[0].message };

    const session = await auth();
    const payload = assertAuthenticated(session);

    if (!checkRateLimit(payload.userId)) {
      return { ok: false, message: "Too many attempts. Please try again later." };
    }

    await changeMyPassword(parsed.data.currentPassword, parsed.data.newPassword, payload);
    resetRateLimit(payload.userId);
    return { ok: true, message: "Password updated. Signing you out…" };
  } catch (err) {
    return { ok: false, message: err instanceof Error ? err.message : "Something went wrong" };
  }
}
