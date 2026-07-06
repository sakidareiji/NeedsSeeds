import Link from "next/link";
import { createAdminClient } from "@/lib/supabase/admin";
import { setPostStatus, setReportStatus } from "@/lib/admin/actions";
import { requireAdmin } from "@/lib/admin/guard";
import { timeAgo } from "@/lib/format";

export const dynamic = "force-dynamic";

export default async function AdminReportsPage() {
  await requireAdmin();
  const admin = createAdminClient();
  const { data } = await admin
    .from("reports")
    .select("id, post_id, reason, status, created_at, post:posts(title, status), reporter:users(display_name)")
    .in("status", ["open", "reviewing"])
    .order("created_at", { ascending: false })
    .limit(100);

  const reports = (data ?? []) as unknown as {
    id: string;
    post_id: string;
    reason: string;
    status: string;
    created_at: string;
    post: { title: string; status: string } | null;
    reporter: { display_name: string } | null;
  }[];

  return (
    <div>
      <h2 className="mb-4 text-lg font-bold">通報キュー</h2>
      {reports.length === 0 ? (
        <p className="py-8 text-center text-sm text-neutral-500">未対応の通報はありません。</p>
      ) : (
        <ul className="space-y-3">
          {reports.map((r) => (
            <li key={r.id} className="rounded-xl border border-neutral-200 bg-white p-4 text-sm">
              <div className="flex flex-wrap items-center gap-2">
                <span className="rounded bg-red-50 px-2 py-0.5 text-xs text-red-700">{r.reason}</span>
                <span className="text-xs text-neutral-400">{timeAgo(r.created_at)}</span>
                {r.status === "reviewing" && (
                  <span className="text-xs text-amber-600">確認中</span>
                )}
              </div>
              <Link href={`/posts/${r.post_id}`} className="mt-1 block font-medium text-brand-700 hover:underline">
                {r.post?.title ?? "(削除済み)"}
              </Link>
              <div className="text-xs text-neutral-500">
                通報者: {r.reporter?.display_name ?? "-"} / 投稿の状態: {r.post?.status ?? "-"}
              </div>
              <div className="mt-2 flex flex-wrap gap-2">
                <form action={setPostStatus.bind(null, r.post_id, "hidden")}>
                  <button className="rounded border border-neutral-300 px-2 py-0.5 text-xs hover:bg-neutral-50">
                    投稿を非公開
                  </button>
                </form>
                <form action={setReportStatus.bind(null, r.id, "reviewing")}>
                  <button className="rounded border border-neutral-300 px-2 py-0.5 text-xs hover:bg-neutral-50">
                    確認中にする
                  </button>
                </form>
                <form action={setReportStatus.bind(null, r.id, "closed")}>
                  <button className="rounded border border-neutral-300 px-2 py-0.5 text-xs hover:bg-neutral-50">
                    対応済みにする
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
