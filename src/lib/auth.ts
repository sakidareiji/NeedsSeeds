import { cache } from "react";
import { createClient } from "@/lib/supabase/server";
import type { Database } from "@/lib/database.types";

export type Profile = Database["public"]["Tables"]["users"]["Row"];

/**
 * The authenticated auth user, or null. Revalidates the token server-side.
 * cache() dedupes the token validation across a single request (ページ本体と
 * attachViewerEmpathized 等から複数回呼ばれても認証サーバーへの往復は1回)。
 */
export const getAuthUser = cache(async () => {
  try {
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    return user;
  } catch (e) {
    // getUser() は無効セッションでは投げない。ここに来るのは環境変数の設定ミス等
    // なので、静かに「未ログイン」へ落とす前に必ずログへ残す。
    console.error("[auth] getAuthUser で予期しないエラー", e);
    return null;
  }
});

/**
 * The current user's public profile row, or null if not signed in.
 * cache() dedupes within a request (layout の Header とページ本体の両方から呼ばれる)。
 */
export const getCurrentProfile = cache(async (): Promise<Profile | null> => {
  const user = await getAuthUser();
  if (!user) return null;
  const supabase = createClient();
  const { data } = await supabase
    .from("users")
    .select("*")
    .eq("id", user.id)
    .single();
  return data;
});
