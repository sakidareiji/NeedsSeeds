import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getAuthUser } from "@/lib/auth";

export const metadata: Metadata = { title: "通知" };

// 通知機能(F8)は M3 で実装。M1 では画面枠のみ用意する。
export default async function NotificationsPage() {
  if (!(await getAuthUser())) redirect("/login");
  return (
    <div>
      <h1 className="mb-6 text-2xl font-bold">通知</h1>
      <p className="py-8 text-center text-sm text-neutral-500">
        通知はまだありません。
      </p>
    </div>
  );
}
