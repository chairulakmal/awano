import Link from "next/link";

const FEATURES = [
  {
    n: "01",
    title: "Isolated workspaces",
    body: "Each team is a fully separated environment. Tickets, users, and categories never cross team boundaries — safe to run multiple organisations on one instance.",
  },
  {
    n: "02",
    title: "Role-based access",
    body: "Requesters see only their own tickets. Support agents work the queue. Managers handle escalations, reassignments, and user access.",
  },
  {
    n: "03",
    title: "Full audit trail",
    body: "Every status transition is recorded with the actor, timestamp, and an optional note. Nothing gets lost; every decision is traceable.",
  },
];

const STATS = [
  { value: "5", label: "roles" },
  { value: "6", label: "ticket states" },
  { value: "3", label: "requester types" },
];

export default function Home() {
  return (
    <div className="flex-1 flex flex-col bg-white text-zinc-900 font-sans">
      {/* Nav */}
      <nav className="flex items-center justify-between px-8 py-5 border-b border-zinc-100">
        <span className="text-base font-semibold tracking-tight">Awano</span>
        <Link
          href="/login"
          className="text-sm font-medium text-primary hover:text-primary-hover transition-colors"
        >
          Sign in →
        </Link>
      </nav>

      {/* Hero */}
      <section className="w-full max-w-5xl mx-auto px-8 py-28">
        <p className="text-xs uppercase tracking-widest text-zinc-400 font-medium mb-7">
          Multi-tenant support desk
        </p>

        <h1 className="text-5xl sm:text-6xl font-semibold tracking-tight leading-[1.08] mb-7 max-w-2xl">
          Every request,{" "}
          <span className="text-primary">handled.</span>
        </h1>

        <p className="text-lg text-zinc-500 max-w-xl leading-relaxed mb-12">
          Customers, recruiters, and field agents open tickets when they need
          help. Your support team picks them up, replies, and tracks every step
          to resolution — one isolated workspace per team.
        </p>

        <div className="flex flex-col sm:flex-row gap-3">
          <Link
            href="/login"
            className="inline-flex items-center justify-center h-11 px-6 rounded-md bg-primary text-white text-sm font-semibold hover:bg-primary-hover transition-colors"
          >
            Sign in
          </Link>
          <a
            href="#how-it-works"
            className="inline-flex items-center justify-center h-11 px-6 rounded-md border border-zinc-200 text-sm font-medium text-zinc-600 hover:border-zinc-300 hover:text-zinc-900 transition-colors"
          >
            How it works →
          </a>
        </div>
      </section>

      {/* Features */}
      <section id="how-it-works" className="bg-zinc-50 border-y border-zinc-100">
        <div className="max-w-5xl mx-auto px-8 py-20 grid grid-cols-1 sm:grid-cols-3 gap-12">
          {FEATURES.map(({ n, title, body }) => (
            <div key={n}>
              <span className="inline-flex items-center justify-center w-7 h-7 rounded-full bg-amber-50 text-primary text-xs font-semibold font-mono mb-5">
                {n}
              </span>
              <h3 className="text-sm font-semibold text-zinc-900 mb-2">
                {title}
              </h3>
              <p className="text-sm text-zinc-500 leading-relaxed">{body}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Stats */}
      <section className="border-b border-zinc-100">
        <div className="max-w-5xl mx-auto px-8 py-14 flex flex-col sm:flex-row items-center justify-center gap-10 sm:gap-0 sm:divide-x sm:divide-zinc-200">
          {STATS.map(({ value, label }) => (
            <div
              key={label}
              className="flex flex-col items-center sm:px-14 text-center"
            >
              <span className="text-3xl font-semibold text-zinc-900">{value}</span>
              <span className="text-xs text-zinc-400 mt-1.5 uppercase tracking-widest">
                {label}
              </span>
            </div>
          ))}
        </div>
      </section>

      {/* Footer */}
      <footer className="px-8 py-6">
        <div className="max-w-5xl mx-auto flex items-center justify-between text-xs text-zinc-400">
          <span>© {new Date().getFullYear()} Awano</span>
          <span>Early development — not production-ready</span>
        </div>
      </footer>
    </div>
  );
}
