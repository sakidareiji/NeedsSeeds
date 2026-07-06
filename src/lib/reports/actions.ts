"use server";

import { createClient } from "@/lib/supabase/server";
import { REPORT_REASONS } from "@/lib/reports/reasons";

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
