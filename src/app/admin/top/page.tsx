import Link from "next/link";
import { listPosts, type SortMode } from "@/lib/posts/queries";
import { setPostStatus } from "@/lib/admin/actions";
import { requireAdmin } from "@/lib/admin/guard";
import { postHandle } from "@/lib/format";
import type { PostStatus } from "@/lib/database.types";

export const dynamic = "force-dynamic";

/**
 * トップ画面の管理(F10)。訪問者がトップ(/)で見るのと同じ並び
 * (注目順/新着、運営投稿の除外込み)をそのまま一覧し、掲載順の確認と
 * 公開状態の操作をここから行える。
 */
export default async function AdminTopPage({
  searchParams,
}: {
  searchParams: { sort?: string };
}) {
  await requireAdmin();
  const sort: SortMode = searchParams.sort === "new" ? "new" : "featured";
  const { items } = await listPosts({ sort, limit: 30 });

  const tab = (mode: SortMode, label: string) => (
    <Link
      href={mode === "featured" ? "/admin/top" : "/admin/top?sort=new"}
      className={`rounded-full px-3 py-1 ${
        sort === mode
          ? "bg-brand-50 font-medium text-brand-700"
          : "text-neutral-500 hover:text-brand-600"
      }`}
    >
      {label}
    </Link>
  );

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-lg font-bold">トップ画面の掲載状況</h2>
        <div className="flex gap-1 text-sm">
          {tab("featured", "注目順")}
          {tab("new", "新着")}
        </div>
      </div>
      <p className="mb-4 text-sm text-neutral-500">
        訪問者がトップページで見るのと同じ並びです(運営アカウントの投稿は表示されません)。
      </p>

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="text-left text-xs text-neutral-500">
            <tr>
              <th className="p-2">#</th>
              <th className="p-2">タイトル</th>
              <th className="p-2">投稿者</th>
              <th className="p-2">わかる</th>
              <th className="p-2">操作</th>
            </tr>
          </thead>
          <tbody>
            {items.map((p, i) => (
              <tr key={p.id} className="border-t border-neutral-200 align-top">
                <td className="p-2 text-neutral-400">{i + 1}</td>
                <td className="p-2">
                  <Link
                    href={`/posts/${postHandle(p.id, p.title)}`}
                    className="text-brand-700 hover:underline"
                  >
                    {p.title}
                  </Link>
                </td>
                <td className="p-2 text-neutral-500">
                  {p.author?.display_name ?? "退会したユーザー"}
                </td>
                <td className="p-2 text-neutral-500">{p.empathy_count}</td>
                <td className="p-2">
                  <div className="flex gap-1">
                    {(["hidden", "deleted"] as PostStatus[]).map((s) => (
                      <form key={s} action={setPostStatus.bind(null, p.id, s)}>
                        <button className="rounded border border-neutral-300 px-2 py-0.5 text-xs hover:bg-neutral-50">
                          {s === "hidden" ? "非公開にする" : "削除"}
                        </button>
                      </form>
                    ))}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {items.length === 0 && (
          <p className="py-8 text-center text-sm text-neutral-500">
            トップに表示される投稿がありません。
          </p>
        )}
      </div>
    </div>
  );
}
