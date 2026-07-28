import Link from "next/link";
import { requireAdmin } from "@/lib/admin/guard";
import { AdminNav } from "@/components/admin/AdminNav";

export const dynamic = "force-dynamic";

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
        {/* 運営は / を開くと運営画面に戻されるため、preview 付きでユーザー向け表示を開く */}
        <Link href="/?preview=1" className="text-sm text-neutral-500 hover:text-brand-600">
          サイトを表示
        </Link>
      </div>
      {/* md以上: 左サイドバー+コンテンツの2カラム。モバイル: 縦積み(ナビは横スクロール) */}
      <div className="md:flex md:items-start md:gap-6">
        <AdminNav />
        <div className="mt-4 min-w-0 flex-1 md:mt-0">{children}</div>
      </div>
    </div>
  );
}
