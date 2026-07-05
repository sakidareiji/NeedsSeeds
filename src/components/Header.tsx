import Link from "next/link";
import type { Profile } from "@/lib/auth";
import { SignOutButton } from "@/components/SignOutButton";

export function Header({ profile }: { profile: Profile | null }) {
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
              <Link href="/notifications" className="text-neutral-600 hover:text-brand-600">
                通知
              </Link>
              <Link
                href={`/u/${profile.id}`}
                className="text-neutral-700 hover:text-brand-600"
              >
                {profile.display_name}
              </Link>
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
