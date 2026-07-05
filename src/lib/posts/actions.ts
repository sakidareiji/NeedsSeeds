"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { postInputSchema } from "@/lib/posts/schema";
import { postHandle } from "@/lib/format";
import { enqueueAnalysis } from "@/lib/analysis/enqueue";

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
  redirect(`/posts/${postHandle(data.id, data.title)}`);
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
    .select("id, title")
    .single();

  if (error || !data) {
    return { error: "更新に失敗しました。" };
  }

  // 内容変更を反映するため AI 解析を再実行。
  enqueueAnalysis(data.id);

  const handle = postHandle(data.id, data.title);
  revalidatePath(`/posts/${handle}`);
  revalidatePath("/");
  redirect(`/posts/${handle}`);
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
