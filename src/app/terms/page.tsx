import type { Metadata } from "next";

export const metadata: Metadata = { title: "利用規約" };

export default function TermsPage() {
  return (
    <article className="prose-sm space-y-4">
      <h1 className="text-2xl font-bold">利用規約</h1>
      <p className="text-sm text-neutral-500">
        ※ 本ページはプレースホルダです。正式版は公開前に差し替えてください。
      </p>
      <p className="text-neutral-700">
        本サービス「Needs Seeds」の利用条件を定めるものです。ユーザーは本規約に同意のうえ本サービスを利用するものとします。
      </p>
    </article>
  );
}
