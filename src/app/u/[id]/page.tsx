import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getAuthUser } from "@/lib/auth";
import { PostCard } from "@/components/PostCard";
import { LIST_SELECT, attachViewerEmpathized, type PostListItem } from "@/lib/posts/queries";
import { GradeBadge } from "@/components/GradeBadge";
import { CompanyBadge } from "@/components/CompanyBadge";
import { Avatar } from "@/components/Avatar";
import { SignOutButton } from "@/components/SignOutButton";
import { nextGrade } from "@config/grades";

export async function generateMetadata({
  params,
}: {
  params: { id: string };
}): Promise<Metadata> {
  const supabase = createClient();
  const { data } = await supabase
    .from("users")
    .select("display_name")
    .eq("id", params.id)
    .maybeSingle();
  return { title: data ? `${data.display_name} さんのプロフィール` : "プロフィール" };
}

export default async function ProfilePage({
  params,
}: {
  params: { id: string };
}) {
  const supabase = createClient();
  const { data: profile } = await supabase
    .from("users")
    .select("id, display_name, bio, contribution_score, role")
    .eq("id", params.id)
    .maybeSingle();
  if (!profile) notFound();

  const authUser = await getAuthUser();
  const isSelf = authUser?.id === profile.id;
  // 運営(admin)の投稿はユーザー画面に出さない。本人が自分のページを
  // 見る場合のみ表示する(一覧側の除外と対になるプロフィール側の措置)。
  const hideOpsPosts = profile.role === "admin" && !isSelf;

  // Own posts include hidden ones; others see only published (RLS enforces this).
  const { data: postsData } = await supabase
    .from("posts")
    .select(LIST_SELECT)
    .eq("user_id", profile.id)
    .neq("status", "deleted")
    .order("created_at", { ascending: false });

  const rawPosts = (postsData ?? []) as unknown as Omit<
    PostListItem,
    "viewer_empathized"
  >[];
  const posts = await attachViewerEmpathized(supabase, rawPosts);
  const resolvedCount = posts.filter((p) => p.resolved_at).length;
  const totalEmpathy = posts.reduce((s, p) => s + p.empathy_count, 0);
  const progress = nextGrade(profile.contribution_score);

  return (
    <div className="space-y-6">
      <section className="rounded-2xl border border-neutral-200 bg-white p-6">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-3">
            <Avatar name={profile.display_name} userId={profile.id} size="lg" />
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-xl font-bold">{profile.display_name}</h1>
              {profile.role === "company" && <CompanyBadge />}
              <GradeBadge score={profile.contribution_score} />
            </div>
          </div>
          {isSelf && (
            <div className="flex items-center gap-4">
              <Link
                href={`/u/${profile.id}/edit`}
                className="text-sm text-brand-600 hover:underline"
              >
                編集
              </Link>
              <SignOutButton />
            </div>
          )}
        </div>
        {profile.bio && (
          <p className="mt-2 whitespace-pre-wrap text-sm text-neutral-600">
            {profile.bio}
          </p>
        )}
        {progress && (
          <p className="mt-2 text-xs text-neutral-500">
            次のグレード「{progress.grade.name}」まであと {progress.remaining}
          </p>
        )}
        <dl className="mt-4 flex flex-wrap gap-6 text-sm">
          <div>
            <dt className="text-neutral-500">貢献スコア</dt>
            <dd className="font-semibold">{profile.contribution_score}</dd>
          </div>
          <div>
            <dt className="text-neutral-500">投稿数</dt>
            <dd className="font-semibold">{posts.length}</dd>
          </div>
          <div>
            <dt className="text-neutral-500">もらった「わかる」</dt>
            <dd className="font-semibold">{totalEmpathy}</dd>
          </div>
          <div>
            <dt className="text-neutral-500">解決済み</dt>
            <dd className="font-semibold">{resolvedCount}</dd>
          </div>
        </dl>
        {/* M3: グレード(芽→双葉→若木→大樹)の表示 */}
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-bold">
          {isSelf ? "あなたの投稿" : "投稿"}
        </h2>
        {hideOpsPosts || posts.length === 0 ? (
          <p className="py-8 text-center text-sm text-neutral-500">
            まだ投稿がありません。
          </p>
        ) : (
          <div className="grid gap-3 lg:grid-cols-2 2xl:grid-cols-3">
            {posts.map((p) => (
              <PostCard key={p.id} post={p} currentUserId={authUser?.id ?? null} />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
