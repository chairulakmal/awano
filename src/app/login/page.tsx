import Link from "next/link";
import { Header } from "@/components/Header";
import { LoginForm } from "./LoginForm";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ team?: string }>;
}) {
  const { team } = await searchParams;

  // Whether the user arrived via a team-scoped URL (e.g. /login?team=demo).
  // Used to decide which hint to show below the card.
  const hasTeam = Boolean(team);

  return (
    <div className="min-h-screen flex flex-col bg-surface-muted">
      <Header />

      {/* Centre the card in the remaining space below the header */}
      <div className="flex-1 flex items-center justify-center px-4">
        <div className="w-full max-w-sm">
          {/* Login card */}
          <div className="rounded-2xl bg-surface p-10 shadow-panel">
            <div className="mb-8">
              <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-primary mb-6 mx-auto">
                <span className="text-white font-bold text-base select-none">A</span>
              </div>
              <h1 className="text-xl font-semibold tracking-tight text-fg-strong text-center">
                Sign in to Awano
              </h1>
              <p className="mt-1.5 text-sm text-fg-muted text-center">
                Enter your team workspace credentials.
              </p>
            </div>

            <LoginForm defaultTeam={team} />
          </div>

          {/*
          Below the card: context-sensitive hint.
          - Team flow (?team=demo): show a quiet link to platform admin login.
          - Bare /login (no team): remind the user this is the platform admin path.
        */}
          {hasTeam ? (
            <p className="mt-6 text-center text-xs text-fg-subtle">
              Reviewing the platform?{" "}
              <Link href="/login" className="text-fg-muted hover:text-primary transition-colors">
                Platform admin login →
              </Link>
            </p>
          ) : (
            <p className="mt-6 text-center text-xs text-fg-subtle">
              Platform admin login. Team members use their workspace link.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
