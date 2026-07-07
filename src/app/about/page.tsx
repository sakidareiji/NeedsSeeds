import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = { title: "運営者情報" };

// ドラフト版。【要記入】の箇所を埋めてから公開すること。

export default function AboutPage() {
  return (
    <article className="mx-auto max-w-3xl space-y-6 text-sm leading-relaxed text-neutral-700">
      <h1 className="text-2xl font-bold text-neutral-900">運営者情報</h1>

      <section className="space-y-2">
        <h2 className="text-lg font-bold text-neutral-900">Needs Seeds について</h2>
        <p>
          Needs Seeds は、日常や仕事の「困りごと」を投稿すると、AIが解決のヒントを探して届けるサービスです。
          困りごとの投稿は愚痴ではなく、同じことに困っている誰かの助けになる価値ある貢献だと考えています。
          共感が集まった投稿や解決の報告が、次の誰かの解決につながる場所を目指しています。
        </p>
      </section>

      <section className="space-y-2">
        <h2 className="text-lg font-bold text-neutral-900">運営者</h2>
        <dl className="space-y-1">
          <div className="flex gap-4">
            <dt className="w-24 shrink-0 text-neutral-500">運営者</dt>
            <dd>【要記入: 運営者名または屋号】</dd>
          </div>
          <div className="flex gap-4">
            <dt className="w-24 shrink-0 text-neutral-500">連絡先</dt>
            <dd>【要記入: メールアドレスまたはフォームURL】</dd>
          </div>
        </dl>
      </section>

      <section className="space-y-2">
        <h2 className="text-lg font-bold text-neutral-900">収益について</h2>
        <p>
          本サービスは、解決のヒントとして紹介する商品・サービスの一部にアフィリエイトプログラムを利用しています。
          広告にあたる紹介には「PR」表記を付けています。紹介の採否や表示順が広告主への配慮で歪まないよう、
          無料ツールや公的制度などの非広告の情報も同じ基準で扱っています。
        </p>
      </section>

      <section className="space-y-2">
        <h2 className="text-lg font-bold text-neutral-900">関連ページ</h2>
        <ul className="list-disc space-y-1 pl-5">
          <li>
            <Link href="/terms" className="text-brand-600 hover:underline">
              利用規約
            </Link>
          </li>
          <li>
            <Link href="/privacy" className="text-brand-600 hover:underline">
              プライバシーポリシー
            </Link>
          </li>
        </ul>
      </section>
    </article>
  );
}
