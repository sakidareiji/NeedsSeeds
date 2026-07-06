import { createAdminClient } from "@/lib/supabase/admin";
import { createNotification } from "@/lib/notifications";
import { gradeCrossed } from "@config/grades";

/**
 * 貢献スコアを1件付与する(F6)。監査・再計算のため必ず contribution_logs に履歴を残し、
 * users.contribution_score(非正規化キャッシュ)は履歴の合計から**再計算**して整合させる。
 *
 * 冪等性: 一度きりの reason(ai_assessment / resolution / high_empathy_resolution)は
 * DB の部分ユニーク制約 (post_id, reason) により二重加点を弾く(投稿の編集で査定が
 * 再実行されても、加点は最初の1回のみ)。
 *
 * @returns 実際に付与されたか(冪等スキップ時は false)
 */
export async function awardContribution(input: {
  userId: string;
  postId: string | null;
  points: number;
  reason: string;
  notify?: boolean; // 貢献スコア獲得の通知を出すか(F8)
}): Promise<boolean> {
  if (input.points <= 0) return false;
  const admin = createAdminClient();

  // 履歴を追加。一度きりの reason が既にあれば unique 違反(23505)→ 冪等スキップ。
  const { error } = await admin.from("contribution_logs").insert({
    user_id: input.userId,
    post_id: input.postId,
    points: input.points,
    reason: input.reason,
  });
  if (error) {
    // 23505 = unique_violation(既に加点済み)。それ以外も加点はしない。
    return false;
  }

  // キャッシュを履歴合計から再計算(ドリフト防止)。
  const { data: before } = await admin
    .from("users")
    .select("contribution_score")
    .eq("id", input.userId)
    .maybeSingle();
  const beforeScore = before?.contribution_score ?? 0;

  const { data: logs } = await admin
    .from("contribution_logs")
    .select("points")
    .eq("user_id", input.userId);
  const afterScore = (logs ?? []).reduce((s, l) => s + l.points, 0);

  await admin
    .from("users")
    .update({ contribution_score: afterScore })
    .eq("id", input.userId);

  // 通知: 貢献スコア獲得(F8)。
  if (input.notify) {
    await createNotification({
      userId: input.userId,
      type: "contribution_earned",
      payload: { points: input.points, reason: input.reason, postId: input.postId },
    });
  }

  // グレード昇格通知(F6/F8)。
  const crossed = gradeCrossed(beforeScore, afterScore);
  if (crossed) {
    await createNotification({
      userId: input.userId,
      type: "grade_up",
      payload: { grade: crossed.name, gradeKey: crossed.key, score: afterScore },
    });
  }

  return true;
}
