import type { Metadata } from "next";
import { ForgotPasswordForm } from "@/components/ForgotPasswordForm";

export const metadata: Metadata = {
  title: "パスワードの再設定",
  // 再設定フローは検索結果に載せない。
  robots: { index: false, follow: false },
};

/** 再設定リンクが無効・期限切れだったときの案内。 */
const ERROR_MESSAGES: Record<string, string> = {
  expired:
    "再設定リンクが無効か、期限切れです。お手数ですが、もう一度メールを送信してください。",
};

export default function ForgotPasswordPage({
  searchParams,
}: {
  searchParams: { error?: string };
}) {
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
      <ForgotPasswordForm />
    </div>
  );
}
