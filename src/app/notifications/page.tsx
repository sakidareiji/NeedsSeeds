import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { getAuthUser } from "@/lib/auth";
import { getNotifications, markAllRead, type NotificationRow } from "@/lib/notifications";
import { timeAgo } from "@/lib/format";

export const metadata: Metadata = { title: "通知" };
export const dynamic = "force-dynamic";

function describe(n: NotificationRow): { text: string; href?: string } {
  const p = n.payload ?? {};
  const postId = typeof p.postId === "string" ? p.postId : undefined;
  const href = postId ? `/posts/${postId}` : undefined;
  switch (n.type) {
    case "empathy_milestone":
      return { text: `あなたの投稿の「わかる」が ${p.count ?? ""} 件に届きました`, href };
    case "solution_presented":
      return { text: "あなたの投稿に解決のヒントが提示されました", href };
    case "contribution_earned":
      return { text: `貢献スコアを ${p.points ?? ""} 獲得しました`, href };
    case "grade_up":
      return { text: `グレードが「${p.grade ?? ""}」に上がりました 🌱` };
    case "resolution_milestone":
      return { text: "解決の節目に達しました", href };
    case "admin":
      return { text: typeof p.message === "string" ? p.message : "運営からのお知らせ" };
    default:
      return { text: "お知らせ" };
  }
}

export default async function NotificationsPage() {
  if (!(await getAuthUser())) redirect("/login");

  const notifications = await getNotifications();
  // 一覧を開いたら未読を既読化する。
  await markAllRead();

  return (
    <div>
      <h1 className="mb-6 text-2xl font-bold">通知</h1>
      {notifications.length === 0 ? (
        <p className="py-8 text-center text-sm text-neutral-500">通知はまだありません。</p>
      ) : (
        <ul className="space-y-2">
          {notifications.map((n) => {
            const d = describe(n);
            const unread = !n.read_at;
            const body = (
              <div
                className={`rounded-xl border p-4 text-sm ${
                  unread ? "border-brand-200 bg-brand-50/50" : "border-neutral-200 bg-white"
                }`}
              >
                <p className="text-neutral-800">{d.text}</p>
                <p className="mt-1 text-xs text-neutral-400">{timeAgo(n.created_at)}</p>
              </div>
            );
            return (
              <li key={n.id}>
                {d.href ? (
                  <Link href={d.href} className="block hover:opacity-80">
                    {body}
                  </Link>
                ) : (
                  body
                )}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
