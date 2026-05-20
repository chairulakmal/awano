import { Header } from "@/components/Header";
import { AdminNav } from "./AdminNav";

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-full flex flex-col bg-zinc-50 bg-dots">
      <Header />
      <main className="flex-1 w-full max-w-5xl mx-auto px-6 py-10">
        <AdminNav />
        {children}
      </main>
    </div>
  );
}
