import { Suspense } from "react";
import { Header } from "@/components/Header";
import { DeskSidebar } from "@/components/DeskSidebar";

export default function DeskLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-full flex flex-col bg-zinc-50 bg-dots">
      <Header />
      <div className="flex-1 w-full max-w-5xl mx-auto px-6 py-10 flex gap-8">
        <Suspense>
          <DeskSidebar />
        </Suspense>
        <main className="flex-1 min-w-0">{children}</main>
      </div>
    </div>
  );
}
