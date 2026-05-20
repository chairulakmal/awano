import Link from "next/link";
import { auth, signOut } from "@/auth";

export async function Header() {
  const session = await auth();
  const user = session?.user;

  return (
    <nav className="sticky top-0 z-10 flex items-center justify-between px-8 py-4 bg-zinc-50/95 backdrop-blur-sm shadow-sm">
      <Link
        href="/"
        className="text-base font-semibold tracking-tight text-zinc-900 hover:text-primary transition-colors"
      >
        Awano
      </Link>

      {user ? (
        <div className="flex items-center gap-5">
          <span className="text-sm text-zinc-500">{user.name ?? user.email}</span>
          <form
            action={async () => {
              "use server";
              await signOut({ redirectTo: "/" });
            }}
          >
            <button
              type="submit"
              className="text-sm font-medium text-zinc-500 hover:text-zinc-900 transition-colors"
            >
              Sign out →
            </button>
          </form>
        </div>
      ) : (
        <Link
          href="/login?team=demo"
          className="text-sm font-medium text-primary hover:text-primary-hover transition-colors"
        >
          Sign in →
        </Link>
      )}
    </nav>
  );
}
