import type { Metadata } from "next";

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
          <li>アカウント情報: メールアドレス、表示名(任意の自己紹介・性別・年齢を含む)</li>
          <li>投稿情報: 困りごとの本文、カテゴリ、リアクション(「わかる」等)、解決報告</li>
          <li>利用ログ: 投稿の閲覧・解決策の表示とクリック等のイベント、アクセスログ</li>
        </ul>
        <p>
          投稿は表示名とともに公開されます。本文に氏名・連絡先などの個人情報を書かないでください。
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
          退会時、表示名・自己紹介・属性情報は匿名化され、ログインできなくなります。
          投稿されたコンテンツは「退会したユーザー」名義で保持されます。
          個別のデータの開示・訂正・削除のご請求は、下記の連絡先までお問い合わせください。
        </p>
      </Section>

      <Section title="8. お問い合わせ">
        {/* TODO(公開前): 専用の問い合わせアドレスを開設したらここに記載する */}
        <p>
          お問い合わせは、運営者情報ページに記載の連絡先までお願いします。
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
