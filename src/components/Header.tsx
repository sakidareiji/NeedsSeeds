import Link from "next/link";
import type { Profile } from "@/lib/auth";
import { SignOutButton } from "@/components/SignOutButton";
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
                className="relative text-neutral-600 hover:text-brand-600"
              >
                通知
                {unread > 0 && (
                  <span className="absolute -right-3 -top-2 rounded-full bg-brand-500 px-1.5 text-[10px] font-semibold text-white">
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
              <SignOutButton />
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
