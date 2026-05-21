import Link from "next/link";
import { auth } from "@/auth";
import { UserMenu } from "./UserMenu";

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
        <UserMenu name={user.name} email={user.email!} role={user.role} />
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
