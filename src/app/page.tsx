import Link from "next/link";
import { listPosts, type SortMode } from "@/lib/posts/queries";
import { getActiveCategories } from "@/lib/categories";
import { getAuthUser } from "@/lib/auth";
import { PostCard } from "@/components/PostCard";
import { CategoryTabs } from "@/components/CategoryTabs";
import { SortTabs } from "@/components/SortTabs";
import { PostedBanner } from "@/components/PostedBanner";

// 常に最新の投稿を反映(即時公開)。
export const dynamic = "force-dynamic";

export default async function HomePage({
  searchParams,
}: {
  searchParams: { sort?: string; posted?: string };
}) {
  const sort: SortMode = searchParams.sort === "new" ? "new" : "featured";
  const [posts, categories, user] = await Promise.all([
    listPosts({ sort }),
    getActiveCategories(),
    getAuthUser(),
  ]);

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

      <div className="flex items-center justify-between">
        <h2 className="text-lg font-bold">みんなの困りごと</h2>
        <SortTabs basePath="/" sort={sort} />
      </div>

      {posts.length === 0 ? (
        <p className="py-12 text-center text-sm text-neutral-500">
          まだ投稿がありません。最初の困りごとを投稿してみませんか?
        </p>
      ) : (
        <div className="grid gap-3 lg:grid-cols-2 2xl:grid-cols-3">
          {posts.map((p) => (
            <PostCard key={p.id} post={p} currentUserId={user?.id ?? null} />
          ))}
        </div>
      )}
    </div>
  );
}
