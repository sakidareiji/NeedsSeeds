"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { postInputSchema } from "@/lib/posts/schema";
import { postHandle } from "@/lib/format";
import { enqueueAnalysis } from "@/lib/analysis/enqueue";
import { precheckDraft } from "@/lib/analysis/precheck";
import { canCreatePost } from "@/lib/rate-limit";

export type ActionState = { error?: string } | null;

function parse(formData: FormData) {
  return postInputSchema.safeParse({
    title: formData.get("title"),
    body: formData.get("body"),
    category_id: formData.get("category_id"),
    severity: formData.get("severity"),
    frequency: formData.get("frequency") ?? undefined,
  });
}

/**
 * 投稿前チェック。下書きを軽量なLLM呼び出しで確認し、より良い投稿にする
 * ための助言が必要なら短いアドバイスを返す。AIの失敗・タイムアウトで
 * 投稿を妨げない(エラー時はアドバイスなし扱い=そのまま投稿に進める)。
 */
export async function checkPostDraft(input: {
  title: string;
  body: string;
  severity?: number | null;
  frequency?: string | null;
}): Promise<{ advice: string | null }> {
  const title = String(input.title ?? "").slice(0, 60);
  const body = String(input.body ?? "").slice(0, 2000);
  if (!title.trim() || !body.trim()) return { advice: null };

  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { advice: null };

  try {
    // フォームで入力済みの困る度合い・頻度も渡し、重ねて尋ねないようにする。
    return await precheckDraft({
      title,
      body,
      severity: input.severity ?? null,
      frequency: input.frequency ?? null,
    });
  } catch {
    return { advice: null };
  }
}

/** F2 投稿作成。即時公開(pending状態を挟まない)。AI解析は非同期(M2で接続)。 */
export async function createPost(
  _prev: ActionState,
  formData: FormData
): Promise<ActionState> {
  const parsed = parse(formData);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "入力に誤りがあります" };
  }

  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "ログインが必要です" };

  // レートリミット(§7 投稿: 10件/日/ユーザー)。
  if (!(await canCreatePost(user.id))) {
    return { error: "本日の投稿上限に達しました(1日10件まで)。時間をおいて再度お試しください。" };
  }

  const { data, error } = await supabase
    .from("posts")
    .insert({
      user_id: user.id,
      category_id: parsed.data.category_id,
      title: parsed.data.title,
      body: parsed.data.body,
      severity: parsed.data.severity,
      frequency: parsed.data.frequency,
      // status defaults to 'published' (即時公開), ai_status to 'pending'.
    })
    .select("id, title")
    .single();

  if (error || !data) {
    return { error: "投稿の保存に失敗しました。しばらくして再度お試しください。" };
  }

  // AI解析を非同期起動(保存はブロックしない)。失敗しても投稿は成立する。
  enqueueAnalysis(data.id);

  revalidatePath("/");
  // 投稿完了をホーム画面で通知するため、確認バナー表示用のクエリを付けて遷移する。
  redirect(`/?posted=1`);
}

/** F2 投稿編集(投稿者のみ)。RLS で本人以外は更新不可。 */
export async function updatePost(
  postId: string,
  _prev: ActionState,
  formData: FormData
): Promise<ActionState> {
  const parsed = parse(formData);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "入力に誤りがあります" };
  }

  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "ログインが必要です" };

  const { data, error } = await supabase
    .from("posts")
    .update({
      category_id: parsed.data.category_id,
      title: parsed.data.title,
      body: parsed.data.body,
      severity: parsed.data.severity,
      frequency: parsed.data.frequency,
      // 追記・修正で内容が変わるため再査定する(F3-7 の対話ループ)。
      ai_status: "pending",
    })
    .eq("id", postId)
    .eq("user_id", user.id)
    .eq("empathy_count", 0) // 「わかる」が付いた投稿は編集不可(共感後の改ざん防止)
    .select("id, title")
    .single();

  if (error || !data) {
    // 失敗時のみ原因を調べ、正確なメッセージを返す(成功パスは1往復で済ませる)。
    const { data: current } = await supabase
      .from("posts")
      .select("empathy_count")
      .eq("id", postId)
      .eq("user_id", user.id)
      .maybeSingle();
    if (!current) return { error: "対象の投稿が見つかりません" };
    if (current.empathy_count > 0) {
      return { error: "「わかる」が付いた投稿は編集できません。" };
    }
    return { error: "更新に失敗しました。" };
  }

  // 内容変更を反映するため AI 解析を再実行。
  enqueueAnalysis(data.id);

  const handle = postHandle(data.id, data.title);
  revalidatePath(`/posts/${handle}`);
  revalidatePath("/");
  redirect(`/posts/${handle}`);
}

// 追記(F3-7)の上限。1回の追記と、追記を含む本文全体の上限。
const APPEND_MAX = 500;
const BODY_WITH_APPENDS_MAX = 4000;

/**
 * F3-7 本文への追記。追記促し(運営AIの問いかけ)への応答手段。
 * 既存本文は変更できず末尾への追加のみなので、「わかる」が付いた後でも
 * 許可する(編集ロックの目的である共感後の改ざん防止と両立する)。
 * 内容が増えるため AI 再査定を起動する(対話で品質を育てるループ)。
 */
export async function appendToPost(
  postId: string,
  _prev: ActionState,
  formData: FormData
): Promise<ActionState> {
  const text = String(formData.get("text") ?? "").trim();
  if (!text) return { error: "追記の内容を入力してください" };
  if (text.length > APPEND_MAX) {
    return { error: `追記は${APPEND_MAX}字以内で入力してください` };
  }

  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "ログインが必要です" };

  const { data: post } = await supabase
    .from("posts")
    .select("id, title, body")
    .eq("id", postId)
    .eq("user_id", user.id)
    .maybeSingle();
  if (!post) return { error: "対象の投稿が見つかりません" };

  const stamp = new Date().toLocaleDateString("ja-JP", { timeZone: "Asia/Tokyo" });
  const body = `${post.body}\n\n【追記 ${stamp}】\n${text}`;
  if (body.length > BODY_WITH_APPENDS_MAX) {
    return { error: "追記できる文字数の上限に達しました" };
  }

  const { error } = await supabase
    .from("posts")
    .update({ body, ai_status: "pending" })
    .eq("id", postId)
    .eq("user_id", user.id);
  if (error) return { error: "追記に失敗しました。しばらくして再度お試しください。" };

  enqueueAnalysis(postId);

  revalidatePath(`/posts/${postHandle(post.id, post.title)}`);
  revalidatePath("/");
  return null;
}

/** F2 論理削除(物理削除しない — データ資産保全 §5)。ユーザーには「削除」と表示。 */
export async function deletePost(postId: string): Promise<ActionState> {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "ログインが必要です" };

  const { error } = await supabase
    .from("posts")
    .update({ status: "deleted" })
    .eq("id", postId)
    .eq("user_id", user.id);

  if (error) return { error: "削除に失敗しました。" };

  revalidatePath("/");
  redirect(`/u/${user.id}`);
}
