import Link from "next/link";
import { createAdminClient } from "@/lib/supabase/admin";
import { retryAnalysis } from "@/lib/admin/actions";
import { timeAgo } from "@/lib/format";

export const dynamic = "force-dynamic";

export default async function AdminAnalysisPage() {
  const admin = createAdminClient();
  const { data } = await admin
    .from("posts")
    .select("id, title, created_at")
    .eq("ai_status", "failed")
    .neq("status", "deleted")
    .order("created_at", { ascending: false })
    .limit(100);

  const posts = data ?? [];

  return (
    <div>
      <h2 className="mb-1 text-lg font-bold">解析失敗キュー</h2>
      <p className="mb-4 text-xs text-neutral-500">
        LLM 解析が最大リトライ後も失敗した投稿(F3)。再実行できます。
      </p>
      {posts.length === 0 ? (
        <p className="py-8 text-center text-sm text-neutral-500">解析失敗の投稿はありません。</p>
      ) : (
        <ul className="space-y-2">
          {posts.map((p) => (
            <li
              key={p.id}
              className="flex items-center justify-between gap-3 rounded-xl border border-neutral-200 bg-white p-3 text-sm"
            >
              <Link href={`/posts/${p.id}`} className="text-brand-700 hover:underline">
                {p.title}
              </Link>
              <div className="flex items-center gap-3">
                <span className="text-xs text-neutral-400">{timeAgo(p.created_at)}</span>
                <form action={retryAnalysis.bind(null, p.id)}>
                  <button className="rounded border border-neutral-300 px-2 py-0.5 text-xs hover:bg-neutral-50">
                    再解析
                  </button>
                </form>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
