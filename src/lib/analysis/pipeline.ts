import { createAdminClient } from "@/lib/supabase/admin";
import { analyzePost } from "@/lib/analysis/llm";
import type { AnalysisOutput } from "@/lib/analysis/schema";
import type { Json } from "@/lib/database.types";
import { awardContribution } from "@/lib/contribution";
import {
  createNotification,
  emailSolutionPresented,
  notifyAdmins,
} from "@/lib/notifications";
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
 * 落ちたワーカーが残した 'processing' を再取得するまでの猶予(可視性タイムアウト)。
 * Vercel の maxDuration(60秒)より十分長く取り、正常に動いているワーカーの
 * 投稿を横取りしないようにする。
 */
export const CLAIM_TIMEOUT_MS = 10 * 60 * 1000;

/**
 * 1投稿の解析パイプラインを実行する(非同期ワーカーから呼ぶ)。
 * 例外は投げず、失敗時は ai_status='failed'(人力確認キュー)に落とす。
 *
 * 実行の最初に ai_status='processing' への UPDATE で投稿を「自分のもの」にする
 * (0017)。毎分の Cron と投稿直後の起動が重なっても、確保できたワーカーだけが
 * LLM を呼ぶ。確保できなければ何もせず戻る。
 */
export async function runAnalysis(postId: string): Promise<void> {
  const admin = createAdminClient();

  const staleBefore = new Date(Date.now() - CLAIM_TIMEOUT_MS).toISOString();
  const { data: post } = await admin
    .from("posts")
    .update({ ai_status: "processing", ai_started_at: new Date().toISOString() })
    .eq("id", postId)
    .neq("status", "deleted")
    // 他のワーカーが処理中(かつ生存)なら 0 行になる = 確保失敗。
    .or(`ai_status.neq.processing,ai_started_at.lt.${staleBefore}`)
    .select("id, user_id, title, body, severity, frequency, status, category_id")
    .maybeSingle();

  if (!post) return;

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

    // NG は非公開化(F7)。モデレーションは安全側なので、解析中に投稿が編集
    // されていても(= 確保が外れていても)必ず適用する。
    if (rules.hide) {
      await admin.from("posts").update({ status: "hidden" }).eq("id", post.id);
    }

    // 解析結果の反映は「自分が確保したままのとき」だけ行う。解析中にユーザーが
    // 編集すると ai_status は 'pending' に戻る(0013)ので、古い内容の結果で
    // 'done' にしてしまわないよう、その場合は次のワーカーに任せる。
    // quality_score は表示ソート(F11)用に posts にも保持(0015 でクライアント
    // からは読めない)。
    await admin
      .from("posts")
      .update({ ai_status: "done", quality_score: output.quality_score })
      .eq("id", post.id)
      .eq("ai_status", "processing");

    // 非公開化したら運営へ通知(F7)。再解析での重複通知を避けるため、
    // 公開中→非公開に変わったときだけ送る。
    if (rules.hide && post.status === "published") {
      await notifyAdmins({
        message: `AIモデレーションにより投稿「${post.title}」を非公開にしました。内容を確認してください。`,
        href: "/admin/posts?status=hidden",
        postId: post.id,
      });
    }

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
    // メールは再訪トリガーとしてアプリ内通知を補完する(失敗しても解析は成功扱い)。
    if (postSolutions.length > 0 && (prevSolutionCount ?? 0) === 0) {
      await createNotification({
        userId: post.user_id,
        type: "solution_presented",
        payload: { postId: post.id, count: postSolutions.length },
      });
      await emailSolutionPresented({
        userId: post.user_id,
        postId: post.id,
        postTitle: post.title,
        count: postSolutions.length,
      });
    }
  } catch {
    // 解析失敗 → 人力確認キュー(F3)。投稿・閲覧は影響を受けない。
    // 完了時と同様、確保したままのときだけ失敗として確定させる。
    await admin
      .from("posts")
      .update({ ai_status: "failed" })
      .eq("id", post.id)
      .eq("ai_status", "processing");
  }
}
