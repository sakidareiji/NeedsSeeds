import Link from "next/link";
import type { PostListItem } from "@/lib/posts/queries";
import { postHandle, timeAgo } from "@/lib/format";
import { GradeBadge } from "@/components/GradeBadge";
import { CompanyBadge } from "@/components/CompanyBadge";
import { EmpathyButton } from "@/components/EmpathyButton";

/**
 * 一覧の投稿カード。タイトルの <Link> を疑似要素(after)でカード全体に広げ、
 * カード内どこをクリックしても詳細へ遷移する(stretched link)。本物のアンカー
 * なので新しいタブで開く・URLコピー・クローラ巡回・キーボード操作が全て効く。
 * カテゴリタグ・「わかる」ボタンなど独自の操作を持つ要素は z-index で
 * リンクの上に重ね、そのまま操作できるようにする。
 */
export function PostCard({
  post,
  currentUserId,
}: {
  post: PostListItem;
  currentUserId: string | null;
}) {
  const href = `/posts/${postHandle(post.id, post.title)}`;
  const isOwnPost = currentUserId != null && post.author?.id === currentUserId;

  return (
    <article className="relative rounded-xl border border-neutral-200 bg-white p-4 transition hover:border-brand-300">
      <div className="relative z-10 mb-1 flex items-center gap-2 text-xs text-neutral-500">
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
        <Link href={href} className="after:absolute after:inset-0 hover:text-brand-600">
          {post.title}
        </Link>
      </h2>

      <p className="mt-1 line-clamp-2 text-sm text-neutral-600">{post.body}</p>

      <div className="relative z-10 mt-2 flex flex-wrap items-center gap-2 text-xs text-neutral-500">
        <span>{post.author?.display_name ?? "退会したユーザー"}</span>
        {post.author?.role === "company" && <CompanyBadge />}
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
