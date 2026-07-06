import Link from "next/link";
import { createAdminClient } from "@/lib/supabase/admin";
import { setPostStatus } from "@/lib/admin/actions";
import { timeAgo } from "@/lib/format";
import type { PostStatus } from "@/lib/database.types";

export const dynamic = "force-dynamic";

const STATUS_LABEL: Record<string, string> = {
  published: "公開",
  hidden: "非公開",
  deleted: "削除",
};

export default async function AdminPostsPage({
  searchParams,
}: {
  searchParams: { q?: string; status?: string };
}) {
  const admin = createAdminClient();
  const q = searchParams.q?.trim();
  const status = searchParams.status;

  let query = admin
    .from("posts")
    .select("id, title, status, ai_status, created_at, author:users(display_name)")
    .order("created_at", { ascending: false })
    .limit(100);
  if (q) query = query.ilike("title", `%${q}%`);
  if (status && status !== "all") query = query.eq("status", status as PostStatus);

  const { data } = await query;
  const posts = (data ?? []) as unknown as {
    id: string;
    title: string;
    status: string;
    ai_status: string;
    created_at: string;
    author: { display_name: string } | null;
  }[];

  return (
    <div>
      <h2 className="mb-4 text-lg font-bold">投稿</h2>

      <form className="mb-4 flex flex-wrap gap-2 text-sm">
        <input
          name="q"
          defaultValue={q}
          placeholder="タイトル検索"
          className="rounded-lg border border-neutral-300 px-3 py-1.5"
        />
        <select
          name="status"
          defaultValue={status ?? "all"}
          className="rounded-lg border border-neutral-300 px-3 py-1.5"
        >
          <option value="all">すべての状態</option>
          <option value="published">公開</option>
          <option value="hidden">非公開</option>
          <option value="deleted">削除</option>
        </select>
        <button className="rounded-lg bg-neutral-700 px-4 py-1.5 text-white">検索</button>
      </form>

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="text-left text-xs text-neutral-500">
            <tr>
              <th className="p-2">タイトル</th>
              <th className="p-2">投稿者</th>
              <th className="p-2">状態</th>
              <th className="p-2">解析</th>
              <th className="p-2">操作</th>
            </tr>
          </thead>
          <tbody>
            {posts.map((p) => (
              <tr key={p.id} className="border-t border-neutral-200 align-top">
                <td className="p-2">
                  <Link href={`/posts/${p.id}`} className="text-brand-700 hover:underline">
                    {p.title}
                  </Link>
                </td>
                <td className="p-2 text-neutral-500">{p.author?.display_name ?? "-"}</td>
                <td className="p-2">{STATUS_LABEL[p.status] ?? p.status}</td>
                <td className="p-2 text-neutral-500">{p.ai_status}</td>
                <td className="p-2">
                  <div className="flex gap-1">
                    {(["published", "hidden", "deleted"] as PostStatus[]).map((s) => (
                      <form key={s} action={setPostStatus.bind(null, p.id, s)}>
                        <button
                          disabled={p.status === s}
                          className="rounded border border-neutral-300 px-2 py-0.5 text-xs hover:bg-neutral-50 disabled:opacity-40"
                        >
                          {STATUS_LABEL[s]}
                        </button>
                      </form>
                    ))}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {posts.length === 0 && (
          <p className="py-8 text-center text-sm text-neutral-500">該当する投稿がありません。</p>
        )}
      </div>
      <p className="mt-3 text-xs text-neutral-400">{timeAgo(new Date().toISOString())}時点・最大100件</p>
    </div>
  );
}
