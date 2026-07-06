import { createAdminClient } from "@/lib/supabase/admin";
import { rateLimits } from "@config/limits";

function since24h(): string {
  return new Date(Date.now() - 24 * 3600 * 1000).toISOString();
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
