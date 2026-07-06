"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createNotificationOnce } from "@/lib/notifications";
import { awardContribution } from "@/lib/contribution";
import { logEvent } from "@/lib/events";
import { isEmpathyMilestone } from "@config/reactions";
import { resolutionPoints, scoringConfig } from "@config/scoring";
import { canEmpathize } from "@/lib/rate-limit";
import type { ResolvedBy } from "@/lib/database.types";

export type EmpathyState = { empathized: boolean; count: number; error?: string };

/** F5「わかる」トグル(1ユーザー1投稿1回・取消可)。節目で投稿者へ通知。 */
export async function toggleEmpathy(postId: string): Promise<EmpathyState> {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { empathized: false, count: 0, error: "ログインが必要です" };

  const { data: existing } = await supabase
    .from("empathies")
    .select("id")
    .eq("post_id", postId)
    .eq("user_id", user.id)
    .maybeSingle();

  let empathized: boolean;
  if (existing) {
    await supabase.from("empathies").delete().eq("id", existing.id);
    empathized = false;
  } else {
    // レートリミット(§7 わかる: 200回/日/ユーザー)。付ける操作のみ制限。
    if (!(await canEmpathize(user.id))) {
      return {
        empathized: false,
        count: await empathyCount(supabase, postId),
        error: "本日の「わかる」上限に達しました(1日200回まで)。",
      };
    }
    const { error } = await supabase
      .from("empathies")
      .insert({ post_id: postId, user_id: user.id });
    if (error) {
      // 重複(既に押下済み)などはトグル済み扱いにする。
      return { empathized: true, count: await empathyCount(supabase, postId) };
    }
    empathized = true;
    await onEmpathyAdded(postId, user.id);
  }

  revalidatePath("/");
  return { empathized, count: await empathyCount(supabase, postId) };
}

async function empathyCount(
  supabase: ReturnType<typeof createClient>,
  postId: string
): Promise<number> {
  const { data } = await supabase
    .from("posts")
    .select("empathy_count")
    .eq("id", postId)
    .maybeSingle();
  return data?.empathy_count ?? 0;
}

/** 「わかる」追加後の副作用: 計測と、節目での投稿者通知。 */
async function onEmpathyAdded(postId: string, actorId: string): Promise<void> {
  const supabase = createClient();
  const { data: post } = await supabase
    .from("posts")
    .select("user_id, empathy_count")
    .eq("id", postId)
    .maybeSingle();

  await logEvent({ type: "empathy", userId: actorId, postId });

  if (!post || post.user_id === actorId) return;
  if (isEmpathyMilestone(post.empathy_count)) {
    // トグル(取消→再押下)で同じ節目に再到達しても重複通知しない。
    await createNotificationOnce({
      userId: post.user_id,
      type: "empathy_milestone",
      payload: { postId, count: post.empathy_count },
    });
  }
}

export type ResolutionInput = {
  resolvedBy: ResolvedBy;
  solutionId?: string | null;
};

/** F6 解決報告(投稿者のみ)。解決報告に貢献スコアを加点(高共感はボーナス)。 */
export async function reportResolution(
  postId: string,
  input: ResolutionInput
): Promise<{ ok: boolean; error?: string }> {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "ログインが必要です" };

  const { data: post } = await supabase
    .from("posts")
    .select("id, user_id, empathy_count, resolved_at")
    .eq("id", postId)
    .eq("user_id", user.id)
    .maybeSingle();
  if (!post) return { ok: false, error: "対象の投稿が見つかりません" };

  // 「提示された解決策で解決」は、この投稿に実際に提示された解決策のみ受け付ける。
  // F9 の成果データ(解決策経由の解決)の根拠になるため、任意の ID を許さない。
  let solutionId: string | null = null;
  if (input.resolvedBy === "solution" && input.solutionId) {
    const { data: presented } = await supabase
      .from("post_solutions")
      .select("id")
      .eq("post_id", postId)
      .eq("solution_id", input.solutionId)
      .limit(1)
      .maybeSingle();
    if (!presented) {
      return { ok: false, error: "この投稿に提示された解決策から選んでください" };
    }
    solutionId = input.solutionId;
  }

  const { error } = await supabase
    .from("posts")
    .update({
      resolved_at: new Date().toISOString(),
      resolved_by: input.resolvedBy,
      resolved_solution_id: solutionId,
    })
    .eq("id", postId)
    .eq("user_id", user.id);
  if (error) return { ok: false, error: "解決報告に失敗しました" };

  await logEvent({
    type: "resolution",
    userId: user.id,
    postId,
    solutionId,
    meta: { resolved_by: input.resolvedBy },
  });

  // 初回のみ加点(reason 'resolution' は1投稿1回のユニーク制約で冪等)。
  if (!post.resolved_at) {
    await awardContribution({
      userId: post.user_id,
      postId,
      points: resolutionPoints(post.empathy_count),
      reason: "resolution",
    });
  }

  revalidatePath("/");
  return { ok: true };
}

/** F6 他ユーザーの「私も解決した」。投稿者へ追加加点(取り消し不可・1人1回)。 */
export async function markHelpful(
  postId: string
): Promise<{ ok: boolean; error?: string }> {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "ログインが必要です" };

  const { data: post } = await supabase
    .from("posts")
    .select("user_id")
    .eq("id", postId)
    .maybeSingle();
  if (!post) return { ok: false, error: "対象の投稿が見つかりません" };
  if (post.user_id === user.id) return { ok: false, error: "自分の投稿には付けられません" };

  const { error } = await supabase
    .from("helpful_marks")
    .insert({ post_id: postId, user_id: user.id });
  // 既に付けている(unique違反)場合は加点しない。
  if (error) return { ok: true };

  await awardContribution({
    userId: post.user_id,
    postId,
    points: scoringConfig.helpfulMarkPoints,
    reason: "helpful_mark",
  });

  revalidatePath("/");
  return { ok: true };
}
