import Link from "next/link";
import type { PostListItem } from "@/lib/posts/queries";
import { postHandle, timeAgo } from "@/lib/format";
import { GradeBadge } from "@/components/GradeBadge";

export function PostCard({ post }: { post: PostListItem }) {
  return (
    <article className="rounded-xl border border-neutral-200 bg-white p-4 transition hover:border-brand-300">
      <div className="mb-1 flex items-center gap-2 text-xs text-neutral-500">
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

      <h2 className="font-semibold leading-snug">
        <Link
          href={`/posts/${postHandle(post.id, post.title)}`}
          className="hover:text-brand-600"
        >
          {post.title}
        </Link>
      </h2>

      <p className="mt-1 line-clamp-2 text-sm text-neutral-600">{post.body}</p>

      <div className="mt-2 flex items-center gap-2 text-xs text-neutral-500">
        <span>{post.author?.display_name ?? "退会したユーザー"}</span>
        {post.author && <GradeBadge score={post.author.contribution_score} />}
        <span className="ml-2">わかる {post.empathy_count}</span>
      </div>
    </article>
  );
}
