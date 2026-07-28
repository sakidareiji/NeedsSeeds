"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { profileInputSchema } from "@/lib/profile/schema";

export type ActionState = { error?: string } | null;

/** プロフィール編集(本人のみ)。RLS で他人の行は更新不可。 */
export async function updateProfile(
  _prev: ActionState,
  formData: FormData
): Promise<ActionState> {
  const parsed = profileInputSchema.safeParse({
    display_name: formData.get("display_name"),
    bio: formData.get("bio"),
    gender: formData.get("gender"),
    age: formData.get("age"),
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "入力に誤りがあります" };
  }

  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "ログインが必要です" };

  const { error } = await supabase
    .from("users")
    .update({
      display_name: parsed.data.display_name,
      bio: parsed.data.bio,
      gender: parsed.data.gender,
      age: parsed.data.age,
    })
    .eq("id", user.id);

  if (error) return { error: "更新に失敗しました。しばらくして再度お試しください。" };

  revalidatePath(`/u/${user.id}`);
  redirect(`/u/${user.id}`);
}

/**
 * 退会(§5)。投稿・解析データは資産として保持し、個人識別情報の匿名化で対応する。
 * auth ユーザーは物理削除しない — FK が auth.users → public.users → posts と
 * on delete cascade で繋がっており、物理削除すると投稿まで消えてしまうため、
 * ソフトデリート(ログイン不能化)+メールアドレスの解放で「削除」を実現する。
 */
export async function deactivateAccount(): Promise<ActionState> {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "ログインが必要です" };

  const admin = createAdminClient();

  // 1. 公開プロフィールを匿名化(表示名・自己紹介・属性)。
  const { error: anonError } = await admin
    .from("users")
    .update({ display_name: "退会したユーザー", bio: null, gender: null, age: null })
    .eq("id", user.id);
  if (anonError) {
    return { error: "退会処理に失敗しました。しばらくして再度お試しください。" };
  }

  // 2. メールアドレスを無効値に差し替え、同じメールでの再登録をすぐ可能にする。
  await admin.auth.admin.updateUserById(user.id, {
    email: `deleted-${user.id}@deleted.invalid`,
    email_confirm: true,
    user_metadata: { display_name: "退会したユーザー" },
  });

  // 3. ソフトデリート(deleted_at を立てログイン不能に。auth 行は残る)。
  const { error: delError } = await admin.auth.admin.deleteUser(user.id, true);
  if (delError) {
    return { error: "退会処理に失敗しました。しばらくして再度お試しください。" };
  }

  // 4. この端末のセッションを破棄してトップへ。
  await supabase.auth.signOut();
  revalidatePath("/");
  redirect("/");
}
