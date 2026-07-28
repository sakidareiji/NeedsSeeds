import { createAdminClient } from "@/lib/supabase/admin";
import { rateLimits } from "@config/limits";

function since24h(): string {
  return new Date(Date.now() - 24 * 3600 * 1000).toISOString();
}

function since1h(): string {
  return new Date(Date.now() - 3600 * 1000).toISOString();
}

/** 直近24hの投稿数が上限未満か(§7 投稿: 10件/日)。サービスロールで集計。 */
export async function canCreatePost(userId: string): Promise<boolean> {
  const admin = createAdminClient();
  const { count } = await admin
    .from("posts")
    .select("id", { count: "exact", head: true })
    .eq("user_id", userId)
    .neq("status", "deleted")
    .gte("created_at", since24h());
  return (count ?? 0) < rateLimits.postsPerDay;
}

/**
 * 直近24hの「わかる」操作数が上限未満か(§7 わかる: 200回/日)。
 * 追記型の events(type='empathy')で数える(トグルの取消では減らさない)。
 *
 * NOTE: check-then-insert のため並行リクエストで数件超過しうるが、ソフト上限
 * (スパム抑止目的)なので許容する。厳密なレート制限が必要になったら、
 * PostgreSQL の advisory lock または pg_cron で集計・制約を行う必要がある。
 */
export async function canEmpathize(userId: string): Promise<boolean> {
  const admin = createAdminClient();
  const { count } = await admin
    .from("events")
    .select("id", { count: "exact", head: true })
    .eq("type", "empathy")
    .eq("user_id", userId)
    .gte("created_at", since24h());
  return (count ?? 0) < rateLimits.empathiesPerDay;
}

/**
 * 投稿前チェック(下書きのLLM確認)を実行してよいか。
 *
 * 投稿本体と違い DB に行が残らない操作なので、events(type='precheck')の
 * 件数で数える。投稿上限(10件/日)の内側にある機能ではなく、ログインさえ
 * すれば何度でも呼べてしまうため、LLM 課金を守る上限として必要。
 */
export async function canPrecheckDraft(userId: string): Promise<boolean> {
  const admin = createAdminClient();
  const { count } = await admin
    .from("events")
    .select("id", { count: "exact", head: true })
    .eq("type", "precheck")
    .eq("user_id", userId)
    .gte("created_at", since1h());
  return (count ?? 0) < rateLimits.prechecksPerHour;
}
