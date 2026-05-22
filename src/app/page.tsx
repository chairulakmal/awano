import Link from "next/link";
import { Header } from "@/components/Header";

// All user-facing strings live here so they can be replaced with t() calls when next-intl lands.
const COPY = {
  hero: {
    eyebrow: "Multi-tenant support desk",
    heading: "Every request,",
    headingAccent: "handled.",
    body: "Customers, recruiters, and field agents open tickets when they need help. Your support team picks them up, replies, and resolves them — with a complete audit trail and role-based access enforced at every step.",
    ctaPrimary: "Try the demo →",
    ctaSecondary: "How it works →",
  },
  features: {
    eyebrow: "Capabilities",
    items: [
      {
        n: "01",
        title: "Isolated workspaces",
        body: "Each team is a fully sandboxed environment. Tickets, users, and categories never cross team boundaries — safe to run multiple organisations on one instance.",
      },
      {
        n: "02",
        title: "Role-based access",
        body: "Five roles with precise permission boundaries: Requesters see only their own tickets; Support agents work the queue; Managers control escalations; Admins manage team access.",
      },
      {
        n: "03",
        title: "Ticket workflow",
        body: "A finite state machine governs all valid status transitions. Invalid moves are rejected server-side — no shortcut paths around the defined process.",
      },
      {
        n: "04",
        title: "Smart inbox",
        body: "Agents filter by Unassigned, Mine, Open, and Escalated. Priority and status changes apply with optimistic UI — the queue stays responsive without a full page reload.",
      },
      {
        n: "05",
        title: "Immutable audit trail",
        body: "Every status transition is written atomically alongside the ticket update. Actor, timestamp, and optional note are preserved — the history cannot be altered.",
      },
      {
        n: "06",
        title: "Attachments & search",
        body: "Requesters attach images and PDFs directly to tickets. Agents search across subject and body in real time. All results are scoped to the active team.",
      },
    ],
  },
  workflow: {
    eyebrow: "How it works",
    steps: [
      {
        n: "01",
        title: "Submit",
        body: "Customers, recruiters, and field agents open tickets from their portal. Each is categorised, timestamped, and immediately visible in the support queue.",
      },
      {
        n: "02",
        title: "Triage",
        body: "Support agents claim and prioritise tickets, post replies or internal-only notes, and move each ticket through defined status stages.",
      },
      {
        n: "03",
        title: "Resolve",
        body: "Managers escalate, close, or reopen tickets. Every actor and status change is preserved in an audit trail that cannot be edited or deleted.",
      },
    ],
  },
  stats: [
    { value: "5", label: "user roles" },
    { value: "9", label: "workflow transitions" },
    { value: "6", label: "ticket states" },
  ],
  cta: {
    heading: "See the full workflow in action",
    body: "Log in as a support agent, manager, or requester with the demo accounts. No sign-up required.",
    button: "Open the demo →",
  },
  footer: {
    brand: "Awano",
    tagline: `© ${new Date().getFullYear()} Chairul Akmal`,
    license: "MIT License",
    github: "https://github.com/chairulakmal/awano",
  },
};

export default function Home() {
  return (
    <div className="flex-1 flex flex-col text-zinc-900 font-sans">
      <Header />

      {/* Hero */}
      <section className="w-full hero-bg">
        <div className="max-w-5xl mx-auto px-8 py-32">
          <p className="text-xs uppercase tracking-widest text-zinc-500 font-medium mb-8">
            {COPY.hero.eyebrow}
          </p>

          <h1 className="text-5xl sm:text-6xl lg:text-7xl font-semibold tracking-tight leading-[1.06] mb-8 max-w-3xl">
            {COPY.hero.heading}{" "}
            <span className="text-primary">{COPY.hero.headingAccent}</span>
          </h1>

          <p className="text-xl text-zinc-600 max-w-xl leading-relaxed mb-12">
            {COPY.hero.body}
          </p>

          <div className="flex flex-col sm:flex-row gap-4">
            <Link
              href="/login?team=demo"
              className="inline-flex items-center justify-center h-12 px-8 rounded-lg bg-primary text-white text-base font-semibold hover:bg-primary-hover transition-colors shadow-sm"
            >
              {COPY.hero.ctaPrimary}
            </Link>
            <a
              href="#how-it-works"
              className="inline-flex items-center justify-center h-12 px-8 rounded-lg ring-ghost text-base font-medium text-zinc-700 hover:text-zinc-900 transition-colors"
            >
              {COPY.hero.ctaSecondary}
            </a>
            <a
              href={COPY.footer.github}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center justify-center h-12 px-6 rounded-lg text-base font-medium text-zinc-500 hover:text-zinc-800 transition-colors gap-2"
            >
              <svg viewBox="0 0 24 24" className="w-5 h-5 fill-current" aria-hidden="true">
                <path d="M12 2C6.477 2 2 6.477 2 12c0 4.418 2.865 8.166 6.839 9.489.5.092.682-.217.682-.482 0-.237-.009-.868-.013-1.703-2.782.604-3.369-1.342-3.369-1.342-.454-1.154-1.11-1.462-1.11-1.462-.908-.62.069-.607.069-.607 1.003.07 1.531 1.03 1.531 1.03.892 1.529 2.341 1.087 2.91.831.092-.646.35-1.086.636-1.336-2.22-.253-4.555-1.11-4.555-4.943 0-1.091.39-1.984 1.029-2.683-.103-.253-.446-1.27.098-2.647 0 0 .84-.269 2.75 1.025A9.578 9.578 0 0 1 12 6.836a9.59 9.59 0 0 1 2.504.337c1.909-1.294 2.747-1.025 2.747-1.025.546 1.377.203 2.394.1 2.647.64.699 1.028 1.592 1.028 2.683 0 3.842-2.339 4.687-4.566 4.935.359.309.678.919.678 1.852 0 1.336-.012 2.415-.012 2.744 0 .267.18.578.688.48C19.138 20.163 22 16.418 22 12c0-5.523-4.477-10-10-10z" />
              </svg>
              Source code
            </a>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="bg-zinc-100">
        <div className="max-w-5xl mx-auto px-8 py-20">
          <p className="text-xs uppercase tracking-widest text-zinc-500 font-medium mb-10">
            {COPY.features.eyebrow}
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {COPY.features.items.map(({ n, title, body }) => (
              <div key={n} className="bg-white rounded-xl p-8 flex flex-col gap-4 shadow-card">
                <span className="font-mono text-xs font-semibold text-primary tracking-widest">
                  {n}
                </span>
                <h3 className="text-base font-semibold text-zinc-900 leading-snug">{title}</h3>
                <p className="text-sm text-zinc-600 leading-relaxed">{body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Workflow */}
      <section id="how-it-works" className="bg-white">
        <div className="max-w-5xl mx-auto px-8 py-20">
          <p className="text-xs uppercase tracking-widest text-zinc-500 font-medium mb-10">
            {COPY.workflow.eyebrow}
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-0">
            {COPY.workflow.steps.map(({ n, title, body }, i) => (
              <div key={n} className="relative flex flex-col gap-4 sm:pr-10">
                {i < COPY.workflow.steps.length - 1 && (
                  <div className="hidden sm:block absolute top-3 right-0 w-10 border-t border-dashed border-zinc-300" />
                )}
                <span className="font-mono text-xs font-semibold text-primary tracking-widest">
                  {n}
                </span>
                <h3 className="text-base font-semibold text-zinc-900">{title}</h3>
                <p className="text-sm text-zinc-600 leading-relaxed">{body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Stats */}
      <section className="bg-zinc-100">
        <div className="max-w-5xl mx-auto px-8 py-16 flex flex-col sm:flex-row items-center justify-center gap-10 sm:gap-0 sm:divide-x sm:divide-zinc-200">
          {COPY.stats.map(({ value, label }) => (
            <div key={label} className="flex flex-col items-center sm:px-16 text-center">
              <span className="text-4xl font-semibold text-primary tabular-nums">{value}</span>
              <span className="text-xs text-zinc-500 mt-2 uppercase tracking-widest">{label}</span>
            </div>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className="bg-white">
        <div className="max-w-5xl mx-auto px-8 py-20 flex flex-col items-center text-center gap-6">
          <h2 className="text-3xl sm:text-4xl font-semibold tracking-tight leading-tight max-w-xl">
            {COPY.cta.heading}
          </h2>
          <p className="text-base text-zinc-600 max-w-md leading-relaxed">{COPY.cta.body}</p>
          <Link
            href="/login?team=demo"
            className="inline-flex items-center justify-center h-12 px-8 rounded-lg bg-primary text-white text-base font-semibold hover:bg-primary-hover transition-colors shadow-sm"
          >
            {COPY.cta.button}
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-zinc-200 px-8 py-7">
        <div className="max-w-5xl mx-auto flex items-center justify-between text-xs text-zinc-500">
          <span className="font-medium text-zinc-700">{COPY.footer.brand}</span>
          <span>
            {COPY.footer.tagline} ·{" "}
            <a
              href={COPY.footer.github}
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-zinc-800 transition-colors"
            >
              {COPY.footer.license}
            </a>
          </span>
        </div>
      </footer>
    </div>
  );
}
