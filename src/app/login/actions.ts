"use server";

import { AuthError } from "next-auth";
import { unstable_rethrow } from "next/navigation";
import { signIn } from "@/auth";

const rateLimitStore = new Map<string, { count: number; windowStart: number }>();
const WINDOW_MS = 15 * 60 * 1000;
const MAX_ATTEMPTS = 5;

function checkRateLimit(email: string): boolean {
  if (process.env.DISABLE_RATE_LIMIT === "1") return true;
  const now = Date.now();
  const key = email.toLowerCase();
  const entry = rateLimitStore.get(key);
  if (!entry || now - entry.windowStart > WINDOW_MS) {
    rateLimitStore.set(key, { count: 1, windowStart: now });
    return true;
  }
  if (entry.count >= MAX_ATTEMPTS) return false;
  entry.count++;
  return true;
}

export async function demoLoginAction(email: string): Promise<string | null> {
  if (!checkRateLimit(email)) {
    return "Too many login attempts. Please try again later.";
  }
  try {
    await signIn("credentials", {
      team: "demo",
      email,
      password: "oretachinomachida",
      redirectTo: "/",
    });
  } catch (err) {
    unstable_rethrow(err);
    if (err instanceof AuthError) return "Demo login failed.";
    throw err;
  }
  return null;
}

export async function loginAction(
  _prevState: string | null,
  formData: FormData
): Promise<string | null> {
  const email = (formData.get("email") as string) ?? "";

  if (!checkRateLimit(email)) {
    return "Too many login attempts. Please try again later.";
  }

  try {
    const team = formData.get("team") as string | null;
    await signIn("credentials", {
      ...(team ? { team } : {}),
      email,
      password: formData.get("password") as string,
      redirectTo: "/",
    });
  } catch (err) {
    unstable_rethrow(err);
    if (err instanceof AuthError) return "Invalid email or password.";
    throw err;
  }
  return null;
}
