import { redirect } from "next/navigation";

/** 運営画面の入口。開いたらまずトップ画面の掲載状況を見せる。 */
export default function AdminIndexPage() {
  redirect("/admin/top");
}
