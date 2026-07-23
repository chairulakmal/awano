import { Header } from "@/components/Header";
import { SuperNav } from "./SuperNav";

export default function SuperLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-full flex flex-col bg-surface-muted bg-dots">
      <Header />
      <main className="flex-1 w-full max-w-5xl mx-auto px-6 py-10">
        <SuperNav />
        {children}
      </main>
    </div>
  );
}
