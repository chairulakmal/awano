import Link from "next/link";
import { Header } from "@/components/Header";

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
    <div className="flex-1 flex flex-col bg-zinc-50 bg-dots text-zinc-900 font-sans">
      <Header />

      {/* Hero */}
      <section className="w-full hero-bg">
        <div className="max-w-5xl mx-auto px-8 py-32">
          <p className="text-xs uppercase tracking-widest text-zinc-400 font-medium mb-8">
            Multi-tenant support desk
          </p>

          <h1 className="text-5xl sm:text-6xl lg:text-7xl font-semibold tracking-tight leading-[1.06] mb-8 max-w-3xl">
            Every request, <span className="text-primary">handled.</span>
          </h1>

          <p className="text-xl text-zinc-500 max-w-xl leading-relaxed mb-12">
            Customers, recruiters, and field agents open tickets when they need help. Your support
            team picks them up, replies, and tracks every step to resolution — one isolated
            workspace per team.
          </p>

          <div className="flex flex-col sm:flex-row gap-4">
            {/* Primary CTA goes to the demo team so reviewers land pre-scoped */}
            <Link
              href="/login?team=demo"
              className="inline-flex items-center justify-center h-12 px-8 rounded-lg bg-primary text-white text-base font-semibold hover:bg-primary-hover transition-colors shadow-sm"
            >
              Try the demo →
            </Link>
            <a
              href="#how-it-works"
              className="inline-flex items-center justify-center h-12 px-8 rounded-lg ring-ghost text-base font-medium text-zinc-600 hover:text-zinc-900 transition-colors"
            >
              How it works →
            </a>
          </div>
        </div>
      </section>

      {/* Features */}
      <section id="how-it-works" className="bg-zinc-100/70 bg-dots">
        <div className="max-w-5xl mx-auto px-8 py-20">
          <p className="text-xs uppercase tracking-widest text-zinc-400 font-medium mb-10">
            How it works
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
            {FEATURES.map(({ n, title, body }) => (
              <div key={n} className="bg-white rounded-xl p-8 flex flex-col gap-4 shadow-card">
                <span className="font-mono text-xs font-semibold text-primary tracking-widest">
                  {n}
                </span>
                <h3 className="text-base font-semibold text-zinc-900 leading-snug">{title}</h3>
                <p className="text-sm text-zinc-500 leading-relaxed">{body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Stats */}
      <section className="bg-dots">
        <div className="max-w-5xl mx-auto px-8 py-16 flex flex-col sm:flex-row items-center justify-center gap-10 sm:gap-0 sm:divide-x sm:divide-zinc-100">
          {STATS.map(({ value, label }) => (
            <div key={label} className="flex flex-col items-center sm:px-16 text-center">
              <span className="text-4xl font-semibold text-primary tabular-nums">{value}</span>
              <span className="text-xs text-zinc-400 mt-2 uppercase tracking-widest">{label}</span>
            </div>
          ))}
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-zinc-100 px-8 py-7">
        <div className="max-w-5xl mx-auto flex items-center justify-between text-xs text-zinc-400">
          <span className="font-medium text-zinc-500">Awano</span>
          <span>Early development — not production-ready</span>
        </div>
      </footer>
    </div>
  );
}
