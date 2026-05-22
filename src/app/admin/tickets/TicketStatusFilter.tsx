"use client";

import { useRef } from "react";
import { useRouter } from "next/navigation";
import type { TicketStatus } from "@/generated/prisma/enums";

const STATUSES: { value: TicketStatus; label: string }[] = [
  { value: "OPEN", label: "Open" },
  { value: "IN_PROGRESS", label: "In progress" },
  { value: "WAITING_ON_REQUESTER", label: "Waiting" },
  { value: "ESCALATED", label: "Escalated" },
  { value: "RESOLVED", label: "Resolved" },
  { value: "CLOSED", label: "Closed" },
];

export function TicketStatusFilter({
  currentStatus,
  currentQuery,
}: {
  currentStatus?: TicketStatus;
  currentQuery?: string;
}) {
  const router = useRouter();
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  function buildHref(status?: TicketStatus, q?: string) {
    const params = new URLSearchParams();
    if (status) params.set("status", status);
    if (q) params.set("q", q);
    const qs = params.toString();
    return `/admin/tickets${qs ? `?${qs}` : ""}`;
  }

  function handleSearch(e: React.ChangeEvent<HTMLInputElement>) {
    const q = e.target.value;
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => {
      router.push(buildHref(currentStatus, q || undefined));
    }, 300);
  }

  return (
    <div className="flex flex-col sm:flex-row sm:items-center gap-3 mb-6">
      <input
        key={currentQuery}
        type="search"
        defaultValue={currentQuery}
        onChange={handleSearch}
        placeholder="Search tickets…"
        className="w-full sm:w-56 px-3 py-1.5 text-sm rounded-lg border border-zinc-200 bg-white placeholder-zinc-400 focus:outline-none focus:ring-2 focus:ring-primary/40"
      />
      <div className="flex flex-wrap gap-1.5">
        <a
          href={buildHref(undefined, currentQuery)}
          className={`px-3 py-1 text-xs font-medium rounded-full transition-colors ${
            !currentStatus
              ? "bg-zinc-900 text-white"
              : "bg-zinc-100 text-zinc-600 hover:bg-zinc-200"
          }`}
        >
          All
        </a>
        {STATUSES.map(({ value, label }) => (
          <a
            key={value}
            href={buildHref(value, currentQuery)}
            className={`px-3 py-1 text-xs font-medium rounded-full transition-colors ${
              currentStatus === value
                ? "bg-zinc-900 text-white"
                : "bg-zinc-100 text-zinc-600 hover:bg-zinc-200"
            }`}
          >
            {label}
          </a>
        ))}
      </div>
    </div>
  );
}
