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
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user;
});

/** The current user's public profile row, or null if not signed in. */
export async function getCurrentProfile(): Promise<Profile | null> {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;
  const { data } = await supabase
    .from("users")
    .select("*")
    .eq("id", user.id)
    .single();
  return data;
}
