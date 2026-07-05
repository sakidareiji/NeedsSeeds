import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getPostById } from "@/lib/posts/queries";
import { getAuthUser } from "@/lib/auth";
import {
  idFromHandle,
  postHandle,
  timeAgo,
  SEVERITY_LABELS,
  FREQUENCY_LABELS,
} from "@/lib/format";
import type { Frequency } from "@/lib/database.types";
import { DeletePostButton } from "@/components/DeletePostButton";

export async function generateMetadata({
  params,
}: {
  params: { handle: string };
}): Promise<Metadata> {
  const id = idFromHandle(params.handle);
  const post = id ? await getPostById(id) : null;
  if (!post || post.status !== "published") {
    return { title: "投稿が見つかりません" };
  }
  const description = post.body.slice(0, 120);
  return {
    title: post.title,
    description,
    openGraph: {
      title: post.title,
      description,
      type: "article",
      url: `/posts/${postHandle(post.id, post.title)}`,
    },
  };
}

export default async function PostDetailPage({
  params,
}: {
  params: { handle: string };
}) {
  const id = idFromHandle(params.handle);
  if (!id) notFound();

  const post = await getPostById(id);
  // 非公開・削除済みは 404(F11)。ただし本人は自分の非公開投稿を閲覧可(RLS)。
  const user = await getAuthUser();
  const isOwner = user?.id === post?.user_id;
  if (!post || post.status === "deleted") notFound();
  if (post.status !== "published" && !isOwner) notFound();

  return (
    <article className="space-y-6">
      <div>
        <div className="mb-2 flex flex-wrap items-center gap-2 text-xs text-neutral-500">
          {post.category && (
            <Link
              href={`/c/${post.category.slug}`}
              className="rounded-full bg-brand-50 px-2 py-0.5 text-brand-700"
            >
              {post.category.name}
            </Link>
          )}
          {post.status === "hidden" && (
            <span className="rounded-full bg-neutral-200 px-2 py-0.5">非公開</span>
          )}
          {post.resolved_at && (
            <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-emerald-700">
              解決済み
            </span>
          )}
          <span>{timeAgo(post.created_at)}</span>
        </div>

        <h1 className="text-2xl font-bold leading-snug">{post.title}</h1>

        <div className="mt-2 flex items-center gap-3 text-sm text-neutral-500">
          {post.author && (
            <Link href={`/u/${post.author.id}`} className="hover:text-brand-600">
              {post.author.display_name}
            </Link>
          )}
          <span>困る度合い: {SEVERITY_LABELS[post.severity]}</span>
          {post.frequency && (
            <span>頻度: {FREQUENCY_LABELS[post.frequency as Frequency]}</span>
          )}
        </div>
      </div>

      <div className="whitespace-pre-wrap leading-relaxed text-neutral-800">
        {post.body}
      </div>

      <div className="flex items-center gap-4 border-t border-neutral-200 pt-4 text-sm text-neutral-500">
        <span>わかる {post.empathy_count}</span>
        {/* M3: 「わかる」ボタン / 解決報告 UI */}
        {/* M2: 「解決のヒント」セクション(解決策マッチング・一般アドバイス) */}
        {isOwner && (
          <div className="ml-auto flex items-center gap-3">
            <Link
              href={`/posts/${postHandle(post.id, post.title)}/edit`}
              className="hover:text-brand-600"
            >
              編集
            </Link>
            <DeletePostButton postId={post.id} />
          </div>
        )}
      </div>
    </article>
  );
}
