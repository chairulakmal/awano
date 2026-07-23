import { Suspense } from "react";
import { Header } from "@/components/Header";
import { DeskSidebar } from "@/components/DeskSidebar";

export default function DeskLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-full flex flex-col bg-surface-muted bg-dots">
      <Header />
      <div className="flex-1 w-full max-w-5xl mx-auto px-6 py-10 flex flex-col gap-6 sm:flex-row sm:gap-8">
        <Suspense>
          <DeskSidebar />
        </Suspense>
        <main className="flex-1 min-w-0">{children}</main>
      </div>
    </div>
  );
}
