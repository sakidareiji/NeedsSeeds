import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { listPosts, type SortMode } from "@/lib/posts/queries";
import { getActiveCategories } from "@/lib/categories";
import { getAuthUser } from "@/lib/auth";
import { CategoryTabs } from "@/components/CategoryTabs";
import { SortTabs } from "@/components/SortTabs";
import { PostList } from "@/components/PostList";

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: { category: string };
}): Promise<Metadata> {
  const categories = await getActiveCategories();
  const cat = categories.find((c) => c.slug === params.category);
  return { title: cat ? `${cat.name}の困りごと` : "カテゴリ" };
}

export default async function CategoryPage({
  params,
  searchParams,
}: {
  params: { category: string };
  searchParams: { sort?: string; page?: string };
}) {
  const categories = await getActiveCategories();
  const cat = categories.find((c) => c.slug === params.category);
  if (!cat) notFound();

  const sort: SortMode = searchParams.sort === "new" ? "new" : "featured";
  const page = Math.max(1, Number(searchParams.page) || 1);
  const [{ items: posts, hasMore }, user] = await Promise.all([
    listPosts({ categorySlug: cat.slug, sort, page }),
    getAuthUser(),
  ]);

  return (
    <div className="space-y-6">
      <CategoryTabs categories={categories} activeSlug={cat.slug} />
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-bold">{cat.name}の困りごと</h1>
        <SortTabs basePath={`/c/${cat.slug}`} sort={sort} />
      </div>
      <PostList
        posts={posts}
        hasMore={hasMore}
        page={page}
        basePath={`/c/${cat.slug}`}
        sort={sort}
        currentUserId={user?.id ?? null}
        emptyMessage="このカテゴリにはまだ投稿がありません。"
      />
    </div>
  );
}
