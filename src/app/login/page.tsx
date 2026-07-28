import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { AuthForm } from "@/components/AuthForm";
import { getAuthUser } from "@/lib/auth";

export const metadata: Metadata = { title: "ログイン" };

/** /auth/callback・/auth/confirm が失敗時に付けるエラーコードの表示文言。 */
const ERROR_MESSAGES: Record<string, string> = {
  auth: "認証に失敗しました。もう一度お試しください。",
  confirm:
    "確認リンクが無効か、期限切れです。ログインすると確認メールを再送できます。",
};

export default async function LoginPage({
  searchParams,
}: {
  searchParams: { error?: string };
}) {
  if (await getAuthUser()) redirect("/");
  const errorMessage = searchParams.error
    ? ERROR_MESSAGES[searchParams.error]
    : undefined;

  return (
    <div className="space-y-4">
      {errorMessage && (
        <p className="mx-auto max-w-sm rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">
          {errorMessage}
        </p>
      )}
      <AuthForm mode="login" />
    </div>
  );
}
