import { sendAnnouncement } from "@/lib/admin/actions";
import { requireAdmin } from "@/lib/admin/guard";

export const dynamic = "force-dynamic";

/** F8 運営からのお知らせ。全ユーザーへアプリ内通知を一括送信する。 */
export default async function AdminAnnouncementsPage({
  searchParams,
}: {
  searchParams: { sent?: string; error?: string };
}) {
  await requireAdmin();

  return (
    <div className="max-w-xl space-y-4">
      <h2 className="text-lg font-bold">運営からのお知らせ</h2>
      <p className="text-sm text-neutral-500">
        全ユーザー(シードアカウント除く)の通知一覧に届きます。送信の取り消しはできません。
      </p>

      {searchParams.sent && (
        <p className="rounded-xl bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
          {searchParams.sent} 人へ送信しました。
        </p>
      )}
      {searchParams.error && (
        <p className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">
          本文は1〜500字で入力してください。
        </p>
      )}

      <form action={sendAnnouncement} className="space-y-3">
        <textarea
          name="message"
          required
          maxLength={500}
          rows={4}
          placeholder="お知らせの本文(500字以内)"
          className="w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm"
        />
        <button className="rounded-lg bg-brand-500 px-4 py-2 text-sm font-medium text-white hover:bg-brand-600">
          全ユーザーへ送信
        </button>
      </form>
    </div>
  );
}
