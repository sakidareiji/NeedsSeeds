import type { Metadata } from "next";
import "./globals.css";
import { Header } from "@/components/Header";
import { getCurrentProfile } from "@/lib/auth";

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: "Needs Seeds — 困りごとが解決に向かう場所",
    template: "%s | Needs Seeds",
  },
  description:
    "日常や業務の困りごとを投稿すると、AIが解決のヒントを提示します。フリーランス・個人事業主の悩みを解決に。",
};

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const profile = await getCurrentProfile();

  return (
    <html lang="ja">
      <body className="flex min-h-screen flex-col bg-[var(--background)] text-[var(--foreground)] antialiased">
        <Header profile={profile} />
        <main className="w-full flex-1 px-4 py-6 sm:px-6 lg:px-8">{children}</main>
        {/* コンテンツが短いページでも画面下部に留まるフッター(flex-1 の main が余白を吸収) */}
        <footer className="mt-16 w-full border-t border-neutral-200 bg-white">
          <div className="flex w-full flex-col items-center gap-3 px-4 py-6 text-sm text-neutral-500 sm:px-6 lg:px-8">
            <nav className="flex flex-wrap justify-center gap-4">
              <a href="/terms" className="hover:text-brand-600">
                利用規約
              </a>
              <a href="/privacy" className="hover:text-brand-600">
                プライバシーポリシー
              </a>
              <a href="/about" className="hover:text-brand-600">
                運営者情報
              </a>
            </nav>
            <p>© {new Date().getFullYear()} Needs Seeds</p>
          </div>
        </footer>
      </body>
    </html>
  );
}
