import Link from "next/link";
import { listPosts, parseAuthorFilter, type SortMode } from "@/lib/posts/queries";
import { getActiveCategories } from "@/lib/categories";
import { getCurrentProfile } from "@/lib/auth";
import { CategoryTabs } from "@/components/CategoryTabs";
import { SortTabs } from "@/components/SortTabs";
import { AuthorFilterTabs } from "@/components/AuthorFilterTabs";
import { PostList } from "@/components/PostList";
import { PostedBanner } from "@/components/PostedBanner";

// 常に最新の投稿を反映(即時公開)。
export const dynamic = "force-dynamic";

export default async function HomePage({
  searchParams,
}: {
  searchParams: { sort?: string; posted?: string; from?: string; page?: string };
}) {
  const sort: SortMode = searchParams.sort === "new" ? "new" : "featured";
  const page = Math.max(1, Number(searchParams.page) || 1);
  // 投稿者絞り込みは運営(admin)だけが使える(一般ユーザーにはタブも出さない)。
  const profile = await getCurrentProfile();
  const isAdmin = profile?.role === "admin";
  const from = isAdmin ? parseAuthorFilter(searchParams.from) : "all";
  const [{ items: posts, hasMore }, categories] = await Promise.all([
    listPosts({ sort, authorFilter: from, page }),
    getActiveCategories(),
  ]);
  const user = profile;

  return (
    <div className="space-y-6">
      {searchParams.posted === "1" && <PostedBanner />}

      {!user && (
        <section className="rounded-2xl bg-brand-50 p-6">
          <h1 className="text-xl font-bold text-brand-800">
            困りごとが解決に向かう場所
          </h1>
          <p className="mt-2 text-sm text-brand-900/70">
            日々の「困った」を投稿すると、AIが解決のヒントを探します。
            共感が集まり、あなたの声が次の誰かの助けになります。
          </p>
          <Link
            href="/signup"
            className="mt-4 inline-block rounded-full bg-brand-500 px-5 py-2 text-sm font-medium text-white hover:bg-brand-600"
          >
            はじめる
          </Link>
        </section>
      )}

      <CategoryTabs categories={categories} />

      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-lg font-bold">みんなの困りごと</h2>
        <div className="flex items-center gap-4">
          {isAdmin && (
            <>
              <AuthorFilterTabs basePath="/" sort={sort} from={from} />
              <span aria-hidden className="h-4 w-px bg-neutral-200" />
            </>
          )}
          <SortTabs basePath="/" sort={sort} from={from} />
        </div>
      </div>

      <PostList
        posts={posts}
        hasMore={hasMore}
        page={page}
        basePath="/"
        sort={sort}
        from={from}
        currentUserId={user?.id ?? null}
        emptyMessage="まだ投稿がありません。最初の困りごとを投稿してみませんか?"
      />
    </div>
  );
}
