import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import { ContactForm } from "@/components/ContactForm";

export const metadata: Metadata = {
  title: "お問い合わせ",
  description:
    "Needs Seeds へのご質問・ご意見、個人情報の開示・削除のご請求、権利侵害の申告の窓口です。",
};

export const dynamic = "force-dynamic";

/** 公開の問い合わせ窓口(未ログインでも送信できる)。 */
export default async function ContactPage() {
  // ログイン中なら返信先を埋めておく(入力の手間を減らすだけで、変更は自由)。
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return (
    <article className="mx-auto max-w-2xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-neutral-900">お問い合わせ</h1>
        <p className="mt-2 text-sm leading-relaxed text-neutral-600">
          サービスについてのご質問・ご意見のほか、個人情報の開示・訂正・削除のご請求、
          権利侵害や不適切な投稿の申告も、こちらで受け付けます。
          内容を確認のうえ、原則として1週間以内にご返信します。
        </p>
      </div>

      <ContactForm defaultEmail={user?.email} />
    </article>
  );
}
