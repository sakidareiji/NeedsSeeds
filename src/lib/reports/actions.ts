"use server";

import { createClient } from "@/lib/supabase/server";
import { isUniqueViolation } from "@/lib/supabase/errors";
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

  // 対象の存在確認と自己通報の抑止(UIでは自分の投稿に通報ボタンを出さないが、
  // 直接呼び出しでも弾く。markHelpful/toggleEmpathy と同じ扱い)。
  const { data: target } = await supabase
    .from("posts")
    .select("user_id")
    .eq("id", postId)
    .maybeSingle();
  if (!target) return { ok: false, message: "対象の投稿が見つかりません" };
  if (target.user_id === user.id) {
    return { ok: false, message: "自分の投稿は通報できません" };
  }

  const { error } = await supabase
    .from("reports")
    .insert({ post_id: postId, user_id: user.id, reason });
  // 重複通報(unique違反)は成功扱いにする。
  if (error && !isUniqueViolation(error)) {
    return { ok: false, message: "通報に失敗しました" };
  }
  return { ok: true, message: "通報を受け付けました。ご協力ありがとうございます。" };
}
