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
      <body className="bg-[var(--background)] text-[var(--foreground)] antialiased">
        <Header profile={profile} />
        <main className="w-full px-4 py-6 sm:px-6 lg:px-8">{children}</main>
        <footer className="mt-16 w-full px-4 py-8 text-sm text-neutral-500 sm:px-6 lg:px-8">
          <nav className="flex flex-wrap gap-4">
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
          <p className="mt-4">© {new Date().getFullYear()} Needs Seeds</p>
        </footer>
      </body>
    </html>
  );
}
