import { createAdminClient } from "@/lib/supabase/admin";
import { requireAdmin } from "@/lib/admin/guard";

export const dynamic = "force-dynamic";

type CountQuery = PromiseLike<{ count: number | null }>;
async function cnt(q: CountQuery): Promise<number> {
  const { count } = await q;
  return count ?? 0;
}

function Stat({ label, value }: { label: string; value: number | string }) {
  return (
    <div className="rounded-xl border border-neutral-200 bg-white p-4">
      <div className="text-xs text-neutral-500">{label}</div>
      <div className="mt-1 text-2xl font-bold">{value}</div>
    </div>
  );
}

export default async function AdminKpiPage() {
  // layout と page は並列レンダリングされるため、layout の認可には頼らない。
  await requireAdmin();
  const admin = createAdminClient();
  const since = new Date(Date.now() - 24 * 3600 * 1000).toISOString();
  const head = { count: "exact" as const, head: true };

  const [published, pending, failed, openReports, clicks, empathies] =
    await Promise.all([
      cnt(admin.from("posts").select("id", head).eq("status", "published")),
      cnt(admin.from("posts").select("id", head).eq("ai_status", "pending").neq("status", "deleted")),
      cnt(admin.from("posts").select("id", head).eq("ai_status", "failed")),
      cnt(admin.from("reports").select("id", head).eq("status", "open")),
      cnt(admin.from("events").select("id", head).eq("type", "solution_click")),
      cnt(admin.from("events").select("id", head).eq("type", "empathy")),
    ]);

  // DAU 近似: 直近24hのイベントの distinct user_id。
  const { data: recent } = await admin
    .from("events")
    .select("user_id")
    .gte("created_at", since)
    .not("user_id", "is", null)
    .limit(5000);
  const dau = new Set((recent ?? []).map((e) => e.user_id)).size;

  return (
    <div>
      <h2 className="mb-4 text-lg font-bold">主要KPI</h2>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        <Stat label="公開中の投稿" value={published} />
        <Stat label="DAU(24h・近似)" value={dau} />
        <Stat label="解決策クリック(累計)" value={clicks} />
        <Stat label="わかる(累計)" value={empathies} />
        <Stat label="解析待ち" value={pending} />
        <Stat label="解析失敗" value={failed} />
        <Stat label="未対応の通報" value={openReports} />
      </div>
      <p className="mt-4 text-xs text-neutral-400">
        ※ MVP の簡易集計。外部アナリティクスは Vercel Analytics 程度で補う想定(§F9)。
      </p>
    </div>
  );
}
