"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import type { PostListItem } from "@/lib/posts/queries";
import { postHandle, timeAgo } from "@/lib/format";
import { GradeBadge } from "@/components/GradeBadge";
import { EmpathyButton } from "@/components/EmpathyButton";

/**
 * 一覧の投稿カード。カード内どこをクリックしても詳細へ遷移する
 * (カテゴリタグ・「わかる」ボタンなど、独自の操作を持つ要素は
 * stopPropagation で外側への伝播を止める)。
 */
export function PostCard({
  post,
  currentUserId,
}: {
  post: PostListItem;
  currentUserId: string | null;
}) {
  const router = useRouter();
  const href = `/posts/${postHandle(post.id, post.title)}`;
  const isOwnPost = currentUserId != null && post.author?.id === currentUserId;

  return (
    <article
      onClick={() => router.push(href)}
      onKeyDown={(e) => {
        if (e.key === "Enter") router.push(href);
      }}
      role="link"
      tabIndex={0}
      aria-label={post.title}
      className="cursor-pointer rounded-xl border border-neutral-200 bg-white p-4 transition hover:border-brand-300"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="mb-1 flex items-center gap-2 text-xs text-neutral-500"
      >
        {post.category && (
          <Link
            href={`/c/${post.category.slug}`}
            className="rounded-full bg-brand-50 px-2 py-0.5 text-brand-700 hover:bg-brand-100"
          >
            {post.category.name}
          </Link>
        )}
        {post.resolved_at && (
          <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-emerald-700">
            解決済み
          </span>
        )}
        <span>{timeAgo(post.created_at)}</span>
      </div>

      <h2 className="font-semibold leading-snug hover:text-brand-600">
        {post.title}
      </h2>

      <p className="mt-1 line-clamp-2 text-sm text-neutral-600">{post.body}</p>

      <div
        onClick={(e) => e.stopPropagation()}
        className="mt-2 flex flex-wrap items-center gap-2 text-xs text-neutral-500"
      >
        <span>{post.author?.display_name ?? "退会したユーザー"}</span>
        {post.author && <GradeBadge score={post.author.contribution_score} />}
        <EmpathyButton
          postId={post.id}
          initialCount={post.empathy_count}
          initialEmpathized={post.viewer_empathized}
          canReact={currentUserId != null}
          isOwnPost={isOwnPost}
        />
      </div>
    </article>
  );
}
