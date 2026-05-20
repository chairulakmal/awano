"use server";

import { AuthError } from "next-auth";
import { unstable_rethrow } from "next/navigation";
import { signIn } from "@/auth";

export async function loginAction(
  _prevState: string | null,
  formData: FormData
): Promise<string | null> {
  try {
    const team = formData.get("team") as string | null;
    await signIn("credentials", {
      ...(team ? { team } : {}),
      email: formData.get("email") as string,
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
