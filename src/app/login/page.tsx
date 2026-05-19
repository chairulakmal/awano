import { LoginForm } from "./LoginForm";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ team?: string }>;
}) {
  const { team } = await searchParams;

  return (
    <div className="flex min-h-screen items-center justify-center bg-zinc-50 px-4">
      <div className="w-full max-w-sm">
        <div className="rounded-2xl bg-white p-10 shadow-panel">
          <div className="mb-8">
            <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-primary mb-6 mx-auto">
              <span className="text-white font-bold text-base select-none">A</span>
            </div>
            <h1 className="text-xl font-semibold tracking-tight text-zinc-900 text-center">
              Sign in to Awano
            </h1>
            <p className="mt-1.5 text-sm text-zinc-500 text-center">
              Enter your team workspace credentials.
            </p>
          </div>

          <LoginForm defaultTeam={team} />
        </div>
      </div>
    </div>
  );
}
