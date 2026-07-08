import Link from "next/link";
import type { Profile } from "@/lib/auth";
import { Avatar } from "@/components/Avatar";
import { getUnreadCount } from "@/lib/notifications";

export async function Header({ profile }: { profile: Profile | null }) {
  const unread = profile ? await getUnreadCount() : 0;
  return (
    <header className="border-b border-neutral-200 bg-white/80 backdrop-blur">
      <div className="flex w-full items-center justify-between gap-4 px-4 py-3 sm:px-6 lg:px-8">
        <Link href="/" className="flex items-center gap-2 font-bold text-brand-600">
          <span aria-hidden className="text-lg">🌱</span>
          <span>Needs Seeds</span>
        </Link>
        {/* 検索(md以上はボックス、モバイルはアイコンで /search へ) */}
        <form action="/search" className="hidden max-w-xs flex-1 md:block">
          <input
            type="search"
            name="q"
            maxLength={100}
            placeholder="困りごとを検索"
            className="w-full rounded-full border border-neutral-200 bg-neutral-50 px-4 py-1.5 text-sm focus:border-brand-300 focus:bg-white focus:outline-none"
          />
        </form>

        <nav className="flex items-center gap-3 text-sm">
          <Link
            href="/search"
            aria-label="検索"
            title="検索"
            className="p-1 text-neutral-600 hover:text-brand-600 md:hidden"
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
                d="m21 21-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.607 10.607Z"
              />
            </svg>
          </Link>
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
                className="flex items-center gap-1.5 text-neutral-700 hover:text-brand-600"
              >
                <Avatar name={profile.display_name} userId={profile.id} size="sm" />
                <span className="hidden sm:inline">{profile.display_name}</span>
              </Link>
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
