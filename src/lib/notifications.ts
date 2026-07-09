import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import type { Json } from "@/lib/database.types";
import { sendEmail } from "@/lib/email";
import { postHandle } from "@/lib/format";

export type NotificationType =
  | "empathy_milestone"
  | "solution_presented"
  | "contribution_earned"
  | "grade_up"
  | "resolution_milestone"
  | "admin";

/** 通知を1件作成する(F8)。作成はサービスロール(RLSでクライアント作成は不可)。 */
export async function createNotification(input: {
  userId: string;
  type: NotificationType;
  payload?: Record<string, unknown>;
}): Promise<void> {
  const admin = createAdminClient();
  await admin.from("notifications").insert({
    user_id: input.userId,
    type: input.type,
    payload: (input.payload ?? {}) as Json,
  });
}

/**
 * 同一内容の通知が既にあれば作らない(F8)。
 * 「わかる」のトグル循環などで同じ節目に再到達しても通知が重複しないよう、
 * (userId, type, payload の部分一致) で冪等にする。
 */
export async function createNotificationOnce(input: {
  userId: string;
  type: NotificationType;
  payload: Record<string, unknown>;
}): Promise<void> {
  const admin = createAdminClient();
  const { data: existing } = await admin
    .from("notifications")
    .select("id")
    .eq("user_id", input.userId)
    .eq("type", input.type)
    .contains("payload", input.payload)
    .limit(1)
    .maybeSingle();
  if (existing) return;

  await admin.from("notifications").insert({
    user_id: input.userId,
    type: input.type,
    payload: input.payload as Json,
  });
}

/**
 * 解決のヒント提示をメールでも知らせる(再訪トリガー)。アプリ内通知の
 * 補完なので、失敗してもパイプラインには影響させない(sendEmail は投げない)。
 * 呼び出し元(pipeline)が初回提示時のみ呼ぶため、ここでは重複制御しない。
 */
export async function emailSolutionPresented(input: {
  userId: string;
  postId: string;
  postTitle: string;
  count: number;
}): Promise<void> {
  const admin = createAdminClient();
  const { data } = await admin.auth.admin.getUserById(input.userId);
  const email = data?.user?.email;
  // 退会済み(メールを deleted.invalid に差し替え)には送らない
  if (!email || email.endsWith("@deleted.invalid")) return;

  const displayName =
    (data?.user?.user_metadata?.display_name as string | undefined) ?? "投稿者";
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";
  const url = `${siteUrl}/posts/${postHandle(input.postId, input.postTitle)}`;

  await sendEmail({
    to: email,
    subject: "【Needs Seeds】あなたの投稿に解決のヒントが届きました",
    text: [
      `${displayName} さん`,
      "",
      `投稿「${input.postTitle}」に、解決のヒントが${input.count}件届きました。`,
      "以下のリンクから内容を確認できます。",
      "",
      url,
      "",
      "--",
      "Needs Seeds",
      "※このメールは、投稿へのヒント提示をお知らせする自動送信メールです。",
    ].join("\n"),
  });
}

/**
 * 運営(role=admin)全員へ通知する(F7 モデレーション通知・F8)。
 * payload.href に管理画面などのリンク先パスを渡せる。
 */
export async function notifyAdmins(payload: {
  message: string;
  href?: string;
  postId?: string;
}): Promise<void> {
  const admin = createAdminClient();
  const { data: admins } = await admin
    .from("users")
    .select("id")
    .eq("role", "admin");
  if (!admins || admins.length === 0) return;
  await admin.from("notifications").insert(
    admins.map((a) => ({
      user_id: a.id,
      type: "admin" as const,
      payload: payload as unknown as Json,
    }))
  );
}

export type NotificationRow = {
  id: string;
  type: string;
  payload: Record<string, unknown>;
  read_at: string | null;
  created_at: string;
};

/** 自分の通知一覧(F8)。RLS により自分の分のみ。 */
export async function getNotifications(limit = 50): Promise<NotificationRow[]> {
  const supabase = createClient();
  const { data } = await supabase
    .from("notifications")
    .select("id, type, payload, read_at, created_at")
    .order("created_at", { ascending: false })
    .limit(limit);
  return (data ?? []) as unknown as NotificationRow[];
}

/** 未読件数(ベルのバッジ用)。 */
export async function getUnreadCount(): Promise<number> {
  const supabase = createClient();
  const { count } = await supabase
    .from("notifications")
    .select("id", { count: "exact", head: true })
    .is("read_at", null);
  return count ?? 0;
}

/** 自分の未読通知をすべて既読にする。 */
export async function markAllRead(): Promise<void> {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return;
  await supabase
    .from("notifications")
    .update({ read_at: new Date().toISOString() })
    .is("read_at", null)
    .eq("user_id", user.id);
}
