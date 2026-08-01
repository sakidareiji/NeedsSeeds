import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getAuthUser } from "@/lib/auth";
import { ResetPasswordForm } from "@/components/ResetPasswordForm";

export const metadata: Metadata = {
  title: "新しいパスワードの設定",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

/**
 * 新しいパスワードの入力画面。/auth/confirm?type=recovery が張ったセッションを
 * 前提とする。リンクを踏まずに直接開いた場合はセッションが無いので、再送画面へ
 * 戻す(ログイン中のユーザーがここからパスワードを変えるのも可)。
 */
export default async function ResetPasswordPage() {
  if (!(await getAuthUser())) redirect("/forgot-password?error=expired");

  return <ResetPasswordForm />;
}
