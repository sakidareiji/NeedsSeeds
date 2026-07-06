import { createAdminClient } from "@/lib/supabase/admin";
import { analyzePost } from "@/lib/analysis/anthropic";
import type { AnalysisOutput } from "@/lib/analysis/schema";
import type { Json } from "@/lib/database.types";
import { awardContribution } from "@/lib/contribution";
import { createNotification } from "@/lib/notifications";
import { assessmentPoints } from "@config/scoring";

export type AnalysisRuleResult = {
  hide: boolean; // NG(誹謗中傷/個人情報/スパム)→ 自動非公開(F7)
  isSensitive: boolean; // 健康/借金/法律 → 公開維持だが商用マッチング無効(F7)
};

/** モデレーション/センシティブの適用ルール(F7)。純関数でテスト可能に切り出す。 */
export function applyModerationRules(out: AnalysisOutput): AnalysisRuleResult {
  const m = out.moderation;
  return {
    hide: m.abuse || m.pii || m.spam, // NGフラグ → 非公開
    isSensitive: m.sensitive,
  };
}

/**
 * 提示すべき解決策を決定する(F4 / F3-5)。
 * - NG非公開: 何も提示しない
 * - センシティブ: 解決策も一般アドバイスも提示しない
 * - それ以外: マスタにマッチした解決策(id検証済み)、なければ一般アドバイス
 */
export function decidePostSolutions(
  out: AnalysisOutput,
  rules: AnalysisRuleResult,
  validSolutionIds: Set<string>
): { solution_id: string | null; source: "master" | "ai_generated"; pitch_text: string; rank: number }[] {
  if (rules.hide || rules.isSensitive) return [];

  const matched = out.matched_solutions.filter((m) => validSolutionIds.has(m.id));
  if (matched.length > 0) {
    return matched.map((m, i) => ({
      solution_id: m.id,
      source: "master" as const,
      pitch_text: m.pitch,
      rank: i,
    }));
  }

  if (out.general_advice && out.general_advice.trim()) {
    return [
      {
        solution_id: null,
        source: "ai_generated" as const,
        pitch_text: out.general_advice.trim(),
        rank: 0,
      },
    ];
  }
  return [];
}

/**
 * 1投稿の解析パイプラインを実行する(非同期ワーカーから呼ぶ)。
 * 例外は投げず、失敗時は ai_status='failed'(人力確認キュー)に落とす。
 */
export async function runAnalysis(postId: string): Promise<void> {
  const admin = createAdminClient();

  const { data: post } = await admin
    .from("posts")
    .select("id, user_id, title, body, severity, frequency, status, category_id")
    .eq("id", postId)
    .maybeSingle();

  if (!post || post.status === "deleted") return;

  try {
    const [{ data: cats }, { data: sols }, { data: cat }] = await Promise.all([
      admin.from("categories").select("slug, name").eq("is_active", true),
      admin
        .from("solutions")
        .select("id, name, description, commercial_types")
        .eq("status", "active"),
      admin.from("categories").select("name").eq("id", post.category_id).maybeSingle(),
    ]);

    const solutions = sols ?? [];
    const { output, model } = await analyzePost({
      title: post.title,
      body: post.body,
      severity: post.severity,
      frequency: post.frequency,
      categoryName: cat?.name ?? "",
      categories: cats ?? [],
      solutions: solutions.map((s) => ({
        id: s.id,
        name: s.name,
        description: s.description,
        commercial_types: s.commercial_types,
      })),
    });

    const rules = applyModerationRules(output);
    const validIds = new Set(solutions.map((s) => s.id));
    const postSolutions = decidePostSolutions(output, rules, validIds);

    // 解析結果を保存(再実行に備え upsert / 差し替え)。
    await admin.from("post_analyses").upsert(
      {
        post_id: post.id,
        sub_tags: output.sub_tags as Json,
        commercial_type: output.commercial_type,
        moderation_flags: output.moderation as unknown as Json,
        is_sensitive: rules.isSensitive,
        quality_score: output.quality_score,
        follow_up_question: output.follow_up_question,
        raw_llm_output: JSON.parse(JSON.stringify(output)) as Json,
        model,
      },
      { onConflict: "post_id" }
    );

    // 解決策の提示通知は「初めて提示されたとき」だけ出す(編集での再解析で
    // 重複通知しないよう、差し替え前に既存有無を確認する)。
    const { count: prevSolutionCount } = await admin
      .from("post_solutions")
      .select("id", { count: "exact", head: true })
      .eq("post_id", post.id);

    await admin.from("post_solutions").delete().eq("post_id", post.id);
    if (postSolutions.length > 0) {
      await admin
        .from("post_solutions")
        .insert(postSolutions.map((s) => ({ post_id: post.id, ...s })));
    }

    // NG は非公開化(F7)。それ以外は published を維持。quality_score は
    // 表示ソート(F11)用に posts にも保持(クライアントには select しない)。
    await admin
      .from("posts")
      .update({
        ai_status: "done",
        quality_score: output.quality_score,
        ...(rules.hide ? { status: "hidden" } : {}),
      })
      .eq("id", post.id);

    // 貢献スコア付与(F3-6/F6)。モデレーションNG(誹謗中傷/個人情報/スパム)は0点。
    // 冪等(1投稿1回)なので編集による再解析で二重加点しない。
    await awardContribution({
      userId: post.user_id,
      postId: post.id,
      points: assessmentPoints({
        qualityScore: output.quality_score,
        flaggedHarmful: rules.hide,
      }),
      reason: "ai_assessment",
      notify: true,
    });

    // 解決策が提示されたら投稿者へ通知(F6)。初回提示時のみ。
    if (postSolutions.length > 0 && (prevSolutionCount ?? 0) === 0) {
      await createNotification({
        userId: post.user_id,
        type: "solution_presented",
        payload: { postId: post.id, count: postSolutions.length },
      });
    }
  } catch {
    // 解析失敗 → 人力確認キュー(F3)。投稿・閲覧は影響を受けない。
    await admin.from("posts").update({ ai_status: "failed" }).eq("id", post.id);
  }
}
