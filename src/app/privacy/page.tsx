import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = { title: "プライバシーポリシー" };

// 公開前に専門家(弁護士等)の確認を受けることを推奨。
const UPDATED = "2026年7月8日";

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="space-y-2">
      <h2 className="text-lg font-bold text-neutral-900">{title}</h2>
      {children}
    </section>
  );
}

export default function PrivacyPage() {
  return (
    <article className="mx-auto max-w-3xl space-y-6 text-sm leading-relaxed text-neutral-700">
      <div>
        <h1 className="text-2xl font-bold text-neutral-900">プライバシーポリシー</h1>
        <p className="mt-1 text-xs text-neutral-400">最終更新日: {UPDATED}</p>
      </div>

      <p>
        Needs Seeds(以下「本サービス」)は、ユーザーの情報を以下のとおり取り扱います。
      </p>

      <Section title="1. 取得する情報">
        <ul className="list-disc space-y-1 pl-5">
          <li>アカウント情報: メールアドレス、表示名、自己紹介(任意)、性別・年齢(任意)</li>
          <li>投稿情報: 困りごとの本文、カテゴリ、リアクション(「わかる」等)、解決報告</li>
          <li>利用ログ: 投稿の閲覧・解決策の表示とクリック等のイベント、アクセスログ</li>
          <li>お問い合わせ情報: お問い合わせフォームに記入された内容・返信先メールアドレス・送信元IPアドレス</li>
        </ul>
        <p>
          投稿は表示名とともに公開されます。本文に氏名・連絡先などの個人情報を書かないでください。
        </p>
        <p>
          <strong className="font-medium text-neutral-900">性別・年齢は公開されません。</strong>
          統計的な分析にのみ利用し、他のユーザーからは閲覧できません。
        </p>
      </Section>

      <Section title="2. 利用目的">
        <ul className="list-disc space-y-1 pl-5">
          <li>本サービスの提供・維持・改善(認証、通知、不正防止を含む)</li>
          <li>AIによる投稿の解析と、解決策・一般的な情報の提示</li>
          <li>個人を識別できない形式に加工した統計・分析(将来の事業利用を含む)</li>
        </ul>
      </Section>

      <Section title="3. 外部サービスへの送信">
        <p>本サービスは以下の外部サービスを利用しており、必要な情報が送信されます。</p>
        <ul className="list-disc space-y-1 pl-5">
          <li>Supabase(データベース・認証基盤): アカウント情報・投稿データの保管</li>
          <li>Vercel(ホスティング): アクセスログの処理</li>
          <li>
            Google Gemini(AI解析API): 投稿のタイトル・本文等の解析のための送信。
            解析はサービス提供のためにのみ行われます
          </li>
          <li>Google(Google ログインを利用する場合): 認証情報の連携</li>
        </ul>
      </Section>

      <Section title="4. Cookie">
        <p>
          本サービスは、ログイン状態の維持のためにCookieを使用します。
          広告目的のトラッキングCookieは使用していません。
        </p>
      </Section>

      <Section title="5. アフィリエイトリンク">
        <p>
          解決のヒントには「PR」表記のあるアフィリエイトリンクが含まれます。
          リンク先での情報の取扱いは、各事業者のプライバシーポリシーに従います。
        </p>
      </Section>

      <Section title="6. 第三者提供">
        <p>
          法令に基づく場合を除き、個人を識別できる情報を本人の同意なく第三者に提供しません。
          個人を識別できない統計情報はこの限りではありません。
        </p>
      </Section>

      <Section title="7. 退会とデータの取扱い">
        <p>
          退会時、表示名・自己紹介は匿名化され、性別・年齢は削除され、ログインできなくなります。
          投稿されたコンテンツは「退会したユーザー」名義で保持されます。
          個別のデータの開示・訂正・削除のご請求は、下記のお問い合わせ窓口までご連絡ください。
        </p>
      </Section>

      <Section title="8. お問い合わせ">
        <p>
          本ポリシーに関するご質問、および保有する個人データの開示・訂正・削除のご請求は、
          <Link href="/contact" className="text-brand-600 hover:underline">
            お問い合わせフォーム
          </Link>
          からご連絡ください。内容を確認のうえ、原則として1週間以内にご返信します。
        </p>
        <p>
          本サービスは個人により運営されています。運営者の氏名・住所は、
          法令に基づく開示のご請求に対して遅滞なく開示します。
        </p>
      </Section>

      <Section title="9. 改定">
        <p>
          本ポリシーは必要に応じて改定されることがあります。重要な変更は本サービス上で告知します。
        </p>
      </Section>
    </article>
  );
}
