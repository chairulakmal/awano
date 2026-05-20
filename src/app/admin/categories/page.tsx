import { auth } from "@/auth";
import { assertAuthenticated } from "@/lib/auth/assertions";
import { listCategories } from "@/lib/categories/service";
import { deleteCategoryAction } from "./actions";
import { NewCategoryForm } from "./NewCategoryForm";

export default async function AdminCategoriesPage() {
  const session = await auth();
  const payload = assertAuthenticated(session);
  const categories = await listCategories(payload);

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-semibold text-zinc-900">Categories</h1>

      <div className="rounded-xl shadow-card bg-white overflow-hidden">
        {categories.length === 0 ? (
          <p className="px-5 py-8 text-sm text-zinc-400 text-center">No categories yet.</p>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-zinc-100">
                <th className="text-left px-5 py-3 text-xs font-medium text-zinc-400 uppercase tracking-wide">Name</th>
                <th className="text-left px-5 py-3 text-xs font-medium text-zinc-400 uppercase tracking-wide">Slug</th>
                <th className="text-right px-5 py-3 text-xs font-medium text-zinc-400 uppercase tracking-wide">Tickets</th>
                <th className="px-5 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-50">
              {categories.map(cat => (
                <tr key={cat.id} className="hover:bg-zinc-50 transition-colors">
                  <td className="px-5 py-3 font-medium text-zinc-800">{cat.name}</td>
                  <td className="px-5 py-3 text-zinc-400 font-mono text-xs">{cat.slug}</td>
                  <td className="px-5 py-3 text-right text-zinc-500">{cat._count.tickets}</td>
                  <td className="px-5 py-3 text-right">
                    {cat._count.tickets === 0 && (
                      <form action={deleteCategoryAction}>
                        <input type="hidden" name="id" value={cat.id} />
                        <button
                          type="submit"
                          className="text-xs text-red-500 hover:text-red-700 transition-colors"
                        >
                          Delete
                        </button>
                      </form>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <div className="rounded-xl shadow-card bg-white px-5 py-5">
        <h2 className="text-xs font-medium text-zinc-500 uppercase tracking-wide mb-4">New category</h2>
        <NewCategoryForm />
      </div>
    </div>
  );
}
