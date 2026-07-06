import { redirect } from "next/navigation";
import { getCurrentProfile } from "@/lib/auth";

/**
 * 運営(role='admin')のみ許可(F10)。未ログイン/一般ユーザーは追い返す。
 * 管理操作は本チェックを通した後、サービスロール(admin client)で行う。
 */
export async function requireAdmin() {
  const profile = await getCurrentProfile();
  if (!profile) redirect("/login?next=/admin");
  if (profile.role !== "admin") redirect("/");
  return profile;
}

/** 例外を投げるバージョン(Server Action 用。redirect ではなく throw)。 */
export async function assertAdmin(): Promise<void> {
  const profile = await getCurrentProfile();
  if (!profile || profile.role !== "admin") {
    throw new Error("forbidden: admin only");
  }
}
