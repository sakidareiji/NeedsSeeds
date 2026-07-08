import Link from "next/link";
import { PostCard } from "@/components/PostCard";
import type { PostListItem, SortMode } from "@/lib/posts/queries";

/** 未ログイン時に一覧で見せる件数。それ以降は登録CTAを出す。 */
const PREVIEW_LIMIT = 6;

/**
 * 投稿一覧のグリッド+ページ送り。未ログイン時は先頭の数件だけ見せて
 * 無料登録のCTAを出す(投稿詳細ページはSEOのため公開のまま)。
 */
export function PostList({
  posts,
  hasMore,
  page,
  basePath,
  sort,
  currentUserId,
  emptyMessage,
  extraParams,
}: {
  posts: PostListItem[];
  hasMore: boolean;
  page: number;
  basePath: string;
  sort: SortMode;
  currentUserId: string | null;
  emptyMessage: string;
  /** ページ送りリンクに引き継ぐ追加のクエリ(検索の q など)。 */
  extraParams?: Record<string, string>;
}) {
  if (posts.length === 0) {
    return <p className="py-12 text-center text-sm text-neutral-500">{emptyMessage}</p>;
  }

  const isLoggedIn = currentUserId != null;
  const visible = isLoggedIn ? posts : posts.slice(0, PREVIEW_LIMIT);
  const gated = !isLoggedIn && (posts.length > PREVIEW_LIMIT || hasMore);

  const pageHref = (p: number) => {
    const params = new URLSearchParams(extraParams);
    if (sort === "new") params.set("sort", "new");
    if (p > 1) params.set("page", String(p));
    const qs = params.toString();
    return qs ? `${basePath}?${qs}` : basePath;
  };

  return (
    <div className="space-y-4">
      <div className="grid gap-3 lg:grid-cols-2 2xl:grid-cols-3">
        {visible.map((p) => (
          <PostCard key={p.id} post={p} currentUserId={currentUserId} />
        ))}
      </div>

      {gated ? (
        <div className="rounded-2xl border border-brand-200 bg-brand-50/60 p-8 text-center">
          <p className="font-bold text-brand-800">
            続きを見るには、無料登録が必要です
          </p>
          <p className="mx-auto mt-2 max-w-md text-sm text-brand-900/60">
            登録すると、すべての困りごとの閲覧と、投稿・「わかる」でのリアクションができるようになります。
          </p>
          <div className="mt-4 flex items-center justify-center gap-4">
            <Link
              href="/signup"
              className="rounded-full bg-brand-500 px-6 py-2 text-sm font-medium text-white hover:bg-brand-600"
            >
              無料ではじめる
            </Link>
            <Link href="/login" className="text-sm text-brand-700 hover:underline">
              ログイン
            </Link>
          </div>
        </div>
      ) : (
        (page > 1 || hasMore) && (
          <nav className="flex items-center justify-center gap-6 pt-2 text-sm">
            {page > 1 && (
              <Link href={pageHref(page - 1)} className="text-brand-700 hover:underline">
                ← 前のページ
              </Link>
            )}
            <span className="text-neutral-400">ページ {page}</span>
            {hasMore && (
              <Link href={pageHref(page + 1)} className="text-brand-700 hover:underline">
                次のページ →
              </Link>
            )}
          </nav>
        )
      )}
    </div>
  );
}
