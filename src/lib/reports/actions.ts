"use server";

import { createClient } from "@/lib/supabase/server";

export const REPORT_REASONS = [
  { value: "spam", label: "スパム・宣伝" },
  { value: "abuse", label: "誹謗中傷・攻撃的" },
  { value: "privacy", label: "個人情報が含まれる" },
  { value: "sensitive", label: "センシティブ・不適切" },
  { value: "other", label: "その他" },
] as const;

const REASON_VALUES = REPORT_REASONS.map((r) => r.value) as readonly string[];

/** F7 通報。ログインユーザーが理由付きで通報し、運営キューへ送る。 */
export async function reportPost(
  postId: string,
  reason: string
): Promise<{ ok: boolean; message?: string }> {
  if (!REASON_VALUES.includes(reason)) {
    return { ok: false, message: "理由を選択してください" };
  }
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, message: "ログインが必要です" };

  const { error } = await supabase
    .from("reports")
    .insert({ post_id: postId, user_id: user.id, reason });
  // 重複通報(unique違反)は成功扱いにする。
  if (error && !String(error.code).includes("23505")) {
    return { ok: false, message: "通報に失敗しました" };
  }
  return { ok: true, message: "通報を受け付けました。ご協力ありがとうございます。" };
}
