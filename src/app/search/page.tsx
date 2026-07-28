import type { Metadata } from "next";
import { listPosts } from "@/lib/posts/queries";
import { getAuthUser } from "@/lib/auth";
import { PostList } from "@/components/PostList";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "検索",
  robots: { index: false }, // 検索結果ページはインデックスさせない
};

export default async function SearchPage({
  searchParams,
}: {
  searchParams: { q?: string; page?: string };
}) {
  const q = (searchParams.q ?? "").trim().slice(0, 100);
  const page = Math.max(1, Number(searchParams.page) || 1);

  const [result, user] = await Promise.all([
    q
      ? listPosts({ searchQuery: q, sort: "new", page })
      : Promise.resolve({ items: [], hasMore: false }),
    getAuthUser(),
  ]);

  return (
    <div className="space-y-6">
      <h1 className="text-lg font-bold">困りごとを検索</h1>

      <form action="/search" className="flex max-w-xl gap-2">
        <input
          type="search"
          name="q"
          defaultValue={q}
          required
          maxLength={100}
          placeholder="キーワード(例: 確定申告、請求書)"
          className="w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm"
        />
        <button className="shrink-0 rounded-lg bg-brand-500 px-5 py-2 text-sm font-medium text-white hover:bg-brand-600">
          検索
        </button>
      </form>

      {q ? (
        <>
          <p className="text-sm text-neutral-500">
            「{q}」の検索結果
            {result.items.length === 0 ? "" : `(${result.items.length}件${result.hasMore ? "以上" : ""})`}
          </p>
          <PostList
            posts={result.items}
            hasMore={result.hasMore}
            page={page}
            basePath="/search"
            sort="new"
            currentUserId={user?.id ?? null}
            emptyMessage="一致する投稿が見つかりませんでした。別のキーワードをお試しください。"
            extraParams={{ q }}
          />
        </>
      ) : (
        <p className="py-8 text-sm text-neutral-500">
          タイトルと本文からキーワードで検索できます。
        </p>
      )}
    </div>
  );
}
