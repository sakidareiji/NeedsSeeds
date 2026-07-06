"use client";

import { useFormState } from "react-dom";
import { createSeedAccount, importSeedPosts, type AdminResult } from "@/lib/admin/actions";

const field = "rounded-lg border border-neutral-300 px-2 py-1 text-sm";

function Result({ state }: { state: AdminResult | null }) {
  if (!state) return null;
  return (
    <p className={`mt-2 text-sm ${state.ok ? "text-emerald-700" : "text-red-600"}`}>
      {state.message ?? (state.ok ? "完了しました" : "失敗しました")}
    </p>
  );
}

export function SeedAccountForm() {
  const [state, action] = useFormState(createSeedAccount, null);
  return (
    <form action={action} className="flex flex-wrap items-end gap-2">
      <input name="display_name" placeholder="表示名" required className={field} />
      <input name="email" type="email" placeholder="メール" required className={field} />
      <input name="password" type="password" placeholder="パスワード" required className={field} />
      <button className="rounded-lg bg-neutral-700 px-4 py-1.5 text-sm text-white">
        シードアカウント作成
      </button>
      <Result state={state} />
    </form>
  );
}

export function SeedImportForm({
  seedAccounts,
}: {
  seedAccounts: { id: string; display_name: string }[];
}) {
  const [state, action] = useFormState(importSeedPosts, null);
  return (
    <form action={action} className="space-y-3">
      <div className="flex flex-wrap items-center gap-2 text-sm">
        <select name="author_id" required className={field}>
          <option value="">割り当て先(シードアカウント)</option>
          {seedAccounts.map((a) => (
            <option key={a.id} value={a.id}>
              {a.display_name}
            </option>
          ))}
        </select>
        <select name="format" defaultValue="csv" className={field}>
          <option value="csv">CSV</option>
          <option value="json">JSON</option>
        </select>
      </div>
      <textarea
        name="data"
        rows={10}
        required
        placeholder={
          "CSV: 1行目にヘッダ title,body,category,severity,frequency\ncategory はカテゴリの slug(例 money-tax)、severity は1〜5、frequency は daily/weekly/monthly/rarely か空欄\n例: 確定申告が不安,毎年やり方を忘れて困る,money-tax,4,monthly"
        }
        className="w-full rounded-lg border border-neutral-300 px-3 py-2 font-mono text-xs"
      />
      <button className="rounded-lg bg-brand-500 px-4 py-1.5 text-sm text-white">
        一括インポート
      </button>
      <Result state={state} />
    </form>
  );
}
