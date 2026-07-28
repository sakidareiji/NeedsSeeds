"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const NAV = [
  { href: "/admin/top", label: "トップ画面" },
  { href: "/admin/kpi", label: "KPI" },
  { href: "/admin/posts", label: "投稿" },
  { href: "/admin/reports", label: "通報キュー" },
  { href: "/admin/contact", label: "問い合わせ" },
  { href: "/admin/analysis", label: "解析失敗" },
  { href: "/admin/solutions", label: "解決策マスタ" },
  { href: "/admin/categories", label: "カテゴリ" },
  { href: "/admin/import", label: "種投稿インポート" },
  { href: "/admin/announcements", label: "お知らせ" },
];

/**
 * 運営管理のナビゲーション。md以上では左サイドバー、モバイルでは
 * 横スクロールの1行に畳む。現在のページを強調表示する。
 */
export function AdminNav() {
  const pathname = usePathname();

  return (
    <nav
      className="-mx-4 flex gap-1 overflow-x-auto px-4 pb-1 text-sm [scrollbar-width:none] [&::-webkit-scrollbar]:hidden md:mx-0 md:w-44 md:shrink-0 md:flex-col md:gap-1 md:overflow-visible md:px-0 md:pb-0"
    >
      {NAV.map((n) => {
        const active = pathname.startsWith(n.href);
        return (
          <Link
            key={n.href}
            href={n.href}
            className={`whitespace-nowrap rounded-lg px-3 py-1.5 ${
              active
                ? "bg-brand-50 font-medium text-brand-700"
                : "text-neutral-600 hover:bg-neutral-50 hover:text-brand-600"
            }`}
          >
            {n.label}
          </Link>
        );
      })}
    </nav>
  );
}
