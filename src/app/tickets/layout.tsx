import { Header } from "@/components/Header";

export default function TicketsLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-full flex flex-col bg-zinc-50 bg-dots">
      <Header />
      <main className="flex-1 w-full max-w-3xl mx-auto px-6 py-10">{children}</main>
    </div>
  );
}
