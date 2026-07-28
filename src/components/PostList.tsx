import Link from "next/link";
import { PostCard } from "@/components/PostCard";
import type { PostListItem, SortMode } from "@/lib/posts/queries";

/** 未ログインでも無料登録CTAを出すだけのカード(一覧のゲート)。 */
function SignupGate() {
  return (
    <div className="rounded-2xl border border-brand-200 bg-brand-50/60 p-8 text-center">
      <p className="font-bold text-brand-800">続きを見るには、無料登録が必要です</p>
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
  );
}

/**
 * 投稿一覧のグリッド+ページ送り。未ログインでも1ページ目は全件見える
 * (回遊と検索流入を殺さない)。2ページ目以降は無料登録のCTAでゲートする。
 * 投稿詳細ページはSEOのため公開のまま。
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
  const isLoggedIn = currentUserId != null;

  // 未ログインで2ページ目以降(URL直打ち含む)はゲートのみ表示。
  if (!isLoggedIn && page > 1) {
    return <SignupGate />;
  }

  if (posts.length === 0) {
    return <p className="py-12 text-center text-sm text-neutral-500">{emptyMessage}</p>;
  }

  const gated = !isLoggedIn && hasMore;

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
        {posts.map((p) => (
          <PostCard key={p.id} post={p} currentUserId={currentUserId} />
        ))}
      </div>

      {gated ? (
        <SignupGate />
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
