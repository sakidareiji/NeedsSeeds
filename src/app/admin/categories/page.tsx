import { createAdminClient } from "@/lib/supabase/admin";
import { upsertCategory } from "@/lib/admin/actions";

export const dynamic = "force-dynamic";

const field = "rounded-lg border border-neutral-300 px-2 py-1 text-sm";

export default async function AdminCategoriesPage() {
  const admin = createAdminClient();
  const { data } = await admin
    .from("categories")
    .select("id, slug, name, sort_order, is_active")
    .order("sort_order", { ascending: true });
  const categories = data ?? [];

  return (
    <div className="space-y-6">
      <div>
        <h2 className="mb-3 text-lg font-bold">カテゴリを追加</h2>
        <form action={upsertCategory} className="flex flex-wrap items-center gap-2">
          <input name="slug" placeholder="slug" required className={field} />
          <input name="name" placeholder="表示名" required className={field} />
          <input name="sort_order" type="number" defaultValue={0} className={`${field} w-20`} />
          <label className="flex items-center gap-1 text-sm">
            <input type="checkbox" name="is_active" defaultChecked /> 有効
          </label>
          <button className="rounded-lg bg-brand-500 px-4 py-1.5 text-sm text-white">追加</button>
        </form>
      </div>

      <div>
        <h2 className="mb-3 text-lg font-bold">カテゴリ一覧</h2>
        <ul className="space-y-2">
          {categories.map((c) => (
            <li key={c.id} className="rounded-xl border border-neutral-200 bg-white p-3">
              <form action={upsertCategory} className="flex flex-wrap items-center gap-2">
                <input type="hidden" name="id" value={c.id} />
                <input name="slug" defaultValue={c.slug} className={field} />
                <input name="name" defaultValue={c.name} className={field} />
                <input name="sort_order" type="number" defaultValue={c.sort_order} className={`${field} w-20`} />
                <label className="flex items-center gap-1 text-sm">
                  <input type="checkbox" name="is_active" defaultChecked={c.is_active} /> 有効
                </label>
                <button className="rounded-lg border border-neutral-300 px-3 py-1.5 text-sm hover:bg-neutral-50">
                  更新
                </button>
              </form>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
