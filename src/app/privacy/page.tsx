import type { Metadata } from "next";

export const metadata: Metadata = { title: "プライバシーポリシー" };

export default function PrivacyPage() {
  return (
    <article className="prose-sm space-y-4">
      <h1 className="text-2xl font-bold">プライバシーポリシー</h1>
      <p className="text-sm text-neutral-500">
        ※ 本ページはプレースホルダです。正式版は公開前に差し替えてください。
      </p>
      <p className="text-neutral-700">
        本サービスは、ユーザーの個人情報を適切に取り扱います。取得する情報、利用目的、第三者提供の有無などをここに記載します。
      </p>
    </article>
  );
}
