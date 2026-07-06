"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
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
