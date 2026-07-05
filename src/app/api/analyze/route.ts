import { NextResponse, type NextRequest } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { runAnalysis } from "@/lib/analysis/pipeline";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

const BATCH_LIMIT = 25;

/** ANALYSIS_WORKER_SECRET を x-worker-secret か Authorization: Bearer で検証。 */
function authorized(request: NextRequest, secret: string): boolean {
  if (request.headers.get("x-worker-secret") === secret) return true;
  const auth = request.headers.get("authorization");
  return auth === `Bearer ${secret}`;
}

/** pending / failed の投稿を拾い直して解析する(F3 のキュー処理)。 */
async function runBatch(): Promise<number> {
  const admin = createAdminClient();
  const { data } = await admin
    .from("posts")
    .select("id")
    .in("ai_status", ["pending", "failed"])
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
 * バックアップ経路(F3)。通常は投稿時の非同期起動が解析するが、after 失敗や
 * 解析失敗に備え pending/failed を拾い直す。
 * - GET: Vercel Cron 用(毎分バッチ処理)。
 * - POST: 手動実行。body.postId 指定で単一投稿。
 * 認証: ANALYSIS_WORKER_SECRET(未設定なら 503)。
 */
export async function GET(request: NextRequest) {
  const secret = process.env.ANALYSIS_WORKER_SECRET;
  if (!secret) {
    return NextResponse.json({ error: "worker not configured" }, { status: 503 });
  }
  if (!authorized(request, secret)) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  const processed = await runBatch();
  return NextResponse.json({ processed });
}

export async function POST(request: NextRequest) {
  const secret = process.env.ANALYSIS_WORKER_SECRET;
  if (!secret) {
    return NextResponse.json({ error: "worker not configured" }, { status: 503 });
  }
  if (!authorized(request, secret)) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const body = await request.json().catch(() => ({}));
  const postId: unknown = body?.postId;
  if (typeof postId === "string" && postId) {
    await runAnalysis(postId);
    return NextResponse.json({ processed: 1 });
  }

  const processed = await runBatch();
  return NextResponse.json({ processed });
}
