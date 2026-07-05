import { NextResponse, type NextRequest } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { runAnalysis } from "@/lib/analysis/pipeline";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

const BATCH_LIMIT = 10;

/**
 * ANALYSIS_WORKER_SECRET / CRON_SECRET を x-worker-secret か
 * Authorization: Bearer で検証。Vercel Cron は環境変数が CRON_SECRET という
 * 名前のときだけ `Authorization: Bearer <CRON_SECRET>` を付けて呼ぶため、
 * 両方の env を受け付ける。
 */
function workerSecrets(): string[] {
  return [
    process.env.ANALYSIS_WORKER_SECRET,
    process.env.CRON_SECRET,
  ].filter((s): s is string => Boolean(s));
}

function authorized(request: NextRequest, secrets: string[]): boolean {
  const headerSecret = request.headers.get("x-worker-secret");
  const auth = request.headers.get("authorization");
  return secrets.some(
    (s) => headerSecret === s || auth === `Bearer ${s}`
  );
}

/**
 * 未解析の投稿を拾い直して解析する(F3 のキュー処理)。
 * cron(GET)は pending のみ。failed は人力確認キューであり、自動で再試行
 * すると恒久失敗の投稿へ毎分 LLM を叩き続けるため、手動 POST に限定する。
 */
async function runBatch(statuses: ("pending" | "failed")[]): Promise<number> {
  const admin = createAdminClient();
  const { data } = await admin
    .from("posts")
    .select("id")
    .in("ai_status", statuses)
    .neq("status", "deleted")
    .order("created_at", { ascending: true })
    .limit(BATCH_LIMIT);

  const ids = (data ?? []).map((p) => p.id);
  for (const id of ids) {
    await runAnalysis(id);
  }
  return ids.length;
}

/**
 * バックアップ経路(F3)。通常は投稿時の非同期起動が解析するが、fire-and-forget
 * が Vercel 上で保証されないため pending を拾い直す。
 * - GET: Vercel Cron 用(毎分、pending のみ)。
 * - POST: 手動実行。body.postId 指定で単一投稿、指定なしで pending + failed。
 * 認証: ANALYSIS_WORKER_SECRET / CRON_SECRET(どちらも未設定なら 503)。
 */
export async function GET(request: NextRequest) {
  const secrets = workerSecrets();
  if (secrets.length === 0) {
    return NextResponse.json({ error: "worker not configured" }, { status: 503 });
  }
  if (!authorized(request, secrets)) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  const processed = await runBatch(["pending"]);
  return NextResponse.json({ processed });
}

export async function POST(request: NextRequest) {
  const secrets = workerSecrets();
  if (secrets.length === 0) {
    return NextResponse.json({ error: "worker not configured" }, { status: 503 });
  }
  if (!authorized(request, secrets)) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const body = await request.json().catch(() => ({}));
  const postId: unknown = body?.postId;
  if (typeof postId === "string" && postId) {
    await runAnalysis(postId);
    return NextResponse.json({ processed: 1 });
  }

  // 手動実行のみ failed(人力確認キュー)も再試行対象に含める。
  const processed = await runBatch(["pending", "failed"]);
  return NextResponse.json({ processed });
}
