import Link from "next/link";
import type { Profile } from "@/lib/auth";
import { getUnreadCount } from "@/lib/notifications";

export async function Header({ profile }: { profile: Profile | null }) {
  const unread = profile ? await getUnreadCount() : 0;
  return (
    <header className="border-b border-neutral-200 bg-white/80 backdrop-blur">
      <div className="mx-auto flex w-full max-w-3xl items-center justify-between gap-4 px-4 py-3">
        <Link href="/" className="flex items-center gap-2 font-bold text-brand-600">
          <span aria-hidden className="text-lg">🌱</span>
          <span>Needs Seeds</span>
        </Link>
        <nav className="flex items-center gap-3 text-sm">
          {profile ? (
            <>
              <Link
                href="/posts/new"
                className="rounded-full bg-brand-500 px-4 py-1.5 font-medium text-white hover:bg-brand-600"
              >
                投稿する
              </Link>
              <Link
                href="/notifications"
                aria-label="通知"
                title="通知"
                className="relative p-1 text-neutral-600 hover:text-brand-600"
              >
                <svg
                  aria-hidden
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                  strokeWidth={1.5}
                  stroke="currentColor"
                  className="h-5 w-5"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M14.857 17.082a23.848 23.848 0 0 0 5.454-1.31A8.967 8.967 0 0 1 18 9.75V9A6 6 0 0 0 6 9v.75a8.967 8.967 0 0 1-2.312 6.022c1.733.64 3.56 1.085 5.455 1.31m5.714 0a24.255 24.255 0 0 1-5.714 0m5.714 0a3 3 0 1 1-5.714 0"
                  />
                </svg>
                {unread > 0 && (
                  <span className="absolute -right-1.5 -top-1 rounded-full bg-brand-500 px-1.5 text-[10px] font-semibold leading-4 text-white">
                    {unread > 99 ? "99+" : unread}
                  </span>
                )}
              </Link>
              <Link
                href={`/u/${profile.id}`}
                className="text-neutral-700 hover:text-brand-600"
              >
                {profile.display_name}
              </Link>
              {profile.role === "admin" && (
                <Link href="/admin" className="text-neutral-500 hover:text-brand-600">
                  運営
                </Link>
              )}
            </>
          ) : (
            <>
              <Link href="/login" className="text-neutral-600 hover:text-brand-600">
                ログイン
              </Link>
              <Link
                href="/signup"
                className="rounded-full bg-brand-500 px-4 py-1.5 font-medium text-white hover:bg-brand-600"
              >
                新規登録
              </Link>
            </>
          )}
        </nav>
      </div>
    </header>
  );
}
