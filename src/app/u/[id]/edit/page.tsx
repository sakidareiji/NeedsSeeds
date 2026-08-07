import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getAuthUser } from "@/lib/auth";
import { ProfileForm } from "@/components/ProfileForm";
import { DeactivateAccountButton } from "@/components/DeactivateAccountButton";

export const metadata: Metadata = { title: "プロフィールを編集" };

export default async function EditProfilePage({
  params,
}: {
  params: { id: string };
}) {
  const user = await getAuthUser();
  if (!user) redirect(`/login?next=/u/${params.id}/edit`);
  if (user.id !== params.id) notFound(); // 本人のみ編集可

  const supabase = createClient();
  // 性別・年齢は本人限定テーブル(0015)。RLS により他人の行は取得できない。
  const [{ data: profile }, { data: priv }] = await Promise.all([
    supabase
      .from("users")
      .select("display_name, bio")
      .eq("id", params.id)
      .maybeSingle(),
    supabase
      .from("user_private")
      .select("gender, age")
      .eq("user_id", params.id)
      .maybeSingle(),
  ]);
  if (!profile) notFound();

  return (
    <div className="mx-auto max-w-3xl">
      <h1 className="mb-6 text-2xl font-bold">プロフィールを編集</h1>
      <ProfileForm
        defaults={{
          ...profile,
          gender: priv?.gender ?? null,
          age: priv?.age ?? null,
        }}
      />

      <div className="mt-12 border-t border-neutral-200 pt-6">
        <h2 className="mb-1 text-sm font-medium text-neutral-500">退会</h2>
        <p className="mb-3 text-xs text-neutral-400">
          プロフィールは匿名化されます。投稿した困りごとは「退会したユーザー」名義で残ります。
        </p>
        <DeactivateAccountButton />
      </div>
    </div>
  );
}
