import Link from "next/link";
import { createAdminClient } from "@/lib/supabase/admin";
import { setContactStatus } from "@/lib/admin/actions";
import { requireAdmin } from "@/lib/admin/guard";
import { categoryLabel } from "@/lib/contact/schema";
import { timeAgo } from "@/lib/format";

export const dynamic = "force-dynamic";

/**
 * 問い合わせ窓口(/contact)の受信箱。メール通知が届かなくてもここから必ず
 * 読めるようにしている(開示・削除請求の取りこぼしは法令上の問題になる)。
 */
export default async function AdminContactPage({
  searchParams,
}: {
  searchParams: { status?: string };
}) {
  await requireAdmin();
  const status = searchParams.status === "closed" ? "closed" : "open";

  const admin = createAdminClient();
  const { data } = await admin
    .from("contact_messages")
    .select("id, name, email, category, message, status, created_at, user_id")
    .eq("status", status)
    .order("created_at", { ascending: false })
    .limit(100);

  const messages = data ?? [];

  const tab = (value: "open" | "closed", label: string) => (
    <Link
      href={value === "open" ? "/admin/contact" : "/admin/contact?status=closed"}
      className={`rounded-full px-3 py-1 ${
        status === value
          ? "bg-brand-50 font-medium text-brand-700"
          : "text-neutral-500 hover:text-brand-600"
      }`}
    >
      {label}
    </Link>
  );

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-lg font-bold">お問い合わせ</h2>
        <div className="flex items-center gap-1 text-sm">
          {tab("open", "未対応")}
          {tab("closed", "対応済み")}
        </div>
      </div>

      {messages.length === 0 ? (
        <p className="py-8 text-center text-sm text-neutral-500">
          {status === "open" ? "未対応のお問い合わせはありません。" : "対応済みのお問い合わせはありません。"}
        </p>
      ) : (
        <ul className="space-y-3">
          {messages.map((m) => (
            <li
              key={m.id}
              className="rounded-xl border border-neutral-200 bg-white p-4 text-sm"
            >
              <div className="flex flex-wrap items-center gap-2">
                <span className="rounded bg-brand-50 px-2 py-0.5 text-xs text-brand-700">
                  {categoryLabel(m.category)}
                </span>
                <span className="text-xs text-neutral-400">{timeAgo(m.created_at)}</span>
              </div>
              <div className="mt-1 text-xs text-neutral-500">
                {m.name ?? "(お名前未記入)"} /{" "}
                <a href={`mailto:${m.email}`} className="text-brand-600 hover:underline">
                  {m.email}
                </a>
                {m.user_id && (
                  <>
                    {" / "}
                    <Link href={`/u/${m.user_id}`} className="text-brand-600 hover:underline">
                      投稿者プロフィール
                    </Link>
                  </>
                )}
              </div>
              <p className="mt-2 whitespace-pre-wrap text-neutral-800">{m.message}</p>
              <div className="mt-3">
                <form
                  action={setContactStatus.bind(
                    null,
                    m.id,
                    status === "open" ? "closed" : "open"
                  )}
                >
                  <button className="rounded border border-neutral-300 px-2 py-0.5 text-xs hover:bg-neutral-50">
                    {status === "open" ? "対応済みにする" : "未対応に戻す"}
                  </button>
                </form>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
