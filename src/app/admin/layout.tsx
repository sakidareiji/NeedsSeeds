import Link from "next/link";
import { requireAdmin } from "@/lib/admin/guard";

export const dynamic = "force-dynamic";

const NAV = [
  { href: "/admin", label: "KPI" },
  { href: "/admin/posts", label: "投稿" },
  { href: "/admin/reports", label: "通報キュー" },
  { href: "/admin/analysis", label: "解析失敗" },
  { href: "/admin/solutions", label: "解決策マスタ" },
  { href: "/admin/categories", label: "カテゴリ" },
  { href: "/admin/import", label: "種投稿インポート" },
];

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  await requireAdmin();
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-bold">運営管理</h1>
        <Link href="/" className="text-sm text-neutral-500 hover:text-brand-600">
          ← サイトへ戻る
        </Link>
      </div>
      <nav className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1 text-sm">
        {NAV.map((n) => (
          <Link
            key={n.href}
            href={n.href}
            className="whitespace-nowrap rounded-full border border-neutral-200 bg-white px-3 py-1.5 text-neutral-600 hover:border-brand-300"
          >
            {n.label}
          </Link>
        ))}
      </nav>
      <div>{children}</div>
    </div>
  );
}
