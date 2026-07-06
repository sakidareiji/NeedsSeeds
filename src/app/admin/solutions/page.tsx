import { createAdminClient } from "@/lib/supabase/admin";
import { upsertSolution } from "@/lib/admin/actions";

export const dynamic = "force-dynamic";

const field = "rounded-lg border border-neutral-300 px-2 py-1 text-sm";

type Solution = {
  id: string;
  name: string;
  description: string;
  url: string;
  is_affiliate: boolean;
  commercial_types: string[];
  category_ids: number[];
  status: string;
};

function SolutionForm({ s }: { s?: Solution }) {
  return (
    <form action={upsertSolution} className="space-y-2 rounded-xl border border-neutral-200 bg-white p-3">
      {s && <input type="hidden" name="id" value={s.id} />}
      <div className="flex flex-wrap gap-2">
        <input name="name" placeholder="名称" defaultValue={s?.name} required className={`${field} flex-1`} />
        <input name="url" placeholder="リンクURL" defaultValue={s?.url} required className={`${field} flex-1`} />
      </div>
      <input name="description" placeholder="説明" defaultValue={s?.description} className={`${field} w-full`} />
      <div className="flex flex-wrap gap-2">
        <input
          name="commercial_types"
          placeholder="解決策タイプ(カンマ区切り 例: 会計ソフト,ツール)"
          defaultValue={s?.commercial_types.join(", ")}
          className={`${field} flex-1`}
        />
        <input
          name="category_ids"
          placeholder="カテゴリID(カンマ区切り)"
          defaultValue={s?.category_ids.join(", ")}
          className={`${field} w-40`}
        />
      </div>
      <div className="flex flex-wrap items-center gap-3">
        <label className="flex items-center gap-1 text-sm">
          <input type="checkbox" name="is_affiliate" defaultChecked={s?.is_affiliate} />
          アフィリエイト(PR表記が付く)
        </label>
        <select name="status" defaultValue={s?.status ?? "active"} className={field}>
          <option value="active">掲載中</option>
          <option value="paused">停止</option>
        </select>
        <button className="rounded-lg bg-brand-500 px-4 py-1.5 text-sm text-white">
          {s ? "更新" : "追加"}
        </button>
      </div>
    </form>
  );
}

export default async function AdminSolutionsPage() {
  const admin = createAdminClient();
  const { data } = await admin
    .from("solutions")
    .select("id, name, description, url, is_affiliate, commercial_types, category_ids, status")
    .order("created_at", { ascending: false });
  const solutions = (data ?? []) as unknown as Solution[];

  return (
    <div className="space-y-6">
      <div>
        <h2 className="mb-3 text-lg font-bold">解決策を追加</h2>
        <SolutionForm />
      </div>
      <div>
        <h2 className="mb-3 text-lg font-bold">解決策マスタ({solutions.length})</h2>
        <div className="space-y-3">
          {solutions.map((s) => (
            <SolutionForm key={s.id} s={s} />
          ))}
        </div>
      </div>
    </div>
  );
}
