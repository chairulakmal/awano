import { auth } from "@/auth";
import { assertAuthenticated } from "@/lib/auth/assertions";
import { listCategories } from "@/lib/categories/service";
import { DeleteCategoryForm } from "./DeleteCategoryForm";
import { NewCategoryForm } from "./NewCategoryForm";

export default async function AdminCategoriesPage() {
  const session = await auth();
  const payload = assertAuthenticated(session);
  const categories = await listCategories(payload);

  return (
    <div className="space-y-6">
      <h1 className="font-display text-xl font-semibold text-fg-strong">Categories</h1>

      <div className="rounded-xl shadow-card bg-surface overflow-hidden">
        {categories.length === 0 ? (
          <p className="px-5 py-8 text-sm text-fg-subtle text-center">No categories yet.</p>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border-subtle">
                <th className="text-left px-5 py-3 text-xs font-medium text-fg-subtle uppercase tracking-wide">
                  Name
                </th>
                <th className="text-left px-5 py-3 text-xs font-medium text-fg-subtle uppercase tracking-wide">
                  Slug
                </th>
                <th className="text-right px-5 py-3 text-xs font-medium text-fg-subtle uppercase tracking-wide">
                  Tickets
                </th>
                <th className="px-5 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-border-subtle">
              {categories.map((cat) => (
                <tr key={cat.id} className="hover:bg-surface-muted transition-colors">
                  <td className="px-5 py-3 font-medium text-fg-strong">{cat.name}</td>
                  <td className="px-5 py-3 text-fg-subtle font-mono text-xs">{cat.slug}</td>
                  <td className="px-5 py-3 text-right text-fg-muted">{cat._count.tickets}</td>
                  <td className="px-5 py-3 text-right">
                    {cat._count.tickets === 0 && <DeleteCategoryForm categoryId={cat.id} />}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <div className="rounded-xl shadow-card bg-surface px-5 py-5">
        <h2 className="text-xs font-medium text-fg-muted uppercase tracking-wide mb-4">
          New category
        </h2>
        <NewCategoryForm />
      </div>
    </div>
  );
}
