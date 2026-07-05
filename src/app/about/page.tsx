import type { Metadata } from "next";

export const metadata: Metadata = { title: "運営者情報" };

export default function AboutPage() {
  return (
    <article className="prose-sm space-y-4">
      <h1 className="text-2xl font-bold">運営者情報</h1>
      <p className="text-sm text-neutral-500">
        ※ 本ページはプレースホルダです。正式版は公開前に差し替えてください。
      </p>
      <p className="text-neutral-700">
        Needs Seeds は、困りごとが解決に向かう場所を目指して運営されています。
      </p>
    </article>
  );
}
