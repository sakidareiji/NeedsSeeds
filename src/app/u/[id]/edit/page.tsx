import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getAuthUser } from "@/lib/auth";
import { ProfileForm } from "@/components/ProfileForm";

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
  const { data: profile } = await supabase
    .from("users")
    .select("display_name, bio, gender, age")
    .eq("id", params.id)
    .maybeSingle();
  if (!profile) notFound();

  return (
    <div>
      <h1 className="mb-6 text-2xl font-bold">プロフィールを編集</h1>
      <ProfileForm defaults={profile} />
    </div>
  );
}
