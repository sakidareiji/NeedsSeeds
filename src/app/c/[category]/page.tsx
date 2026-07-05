import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { listPosts, type SortMode } from "@/lib/posts/queries";
import { getActiveCategories } from "@/lib/categories";
import { PostCard } from "@/components/PostCard";
import { CategoryTabs } from "@/components/CategoryTabs";
import { SortTabs } from "@/components/SortTabs";

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
  searchParams: { sort?: string };
}) {
  const categories = await getActiveCategories();
  const cat = categories.find((c) => c.slug === params.category);
  if (!cat) notFound();

  const sort: SortMode = searchParams.sort === "new" ? "new" : "featured";
  const posts = await listPosts({ categorySlug: cat.slug, sort });

  return (
    <div className="space-y-6">
      <CategoryTabs categories={categories} activeSlug={cat.slug} />
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-bold">{cat.name}の困りごと</h1>
        <SortTabs basePath={`/c/${cat.slug}`} sort={sort} />
      </div>
      {posts.length === 0 ? (
        <p className="py-12 text-center text-sm text-neutral-500">
          このカテゴリにはまだ投稿がありません。
        </p>
      ) : (
        <div className="space-y-3">
          {posts.map((p) => (
            <PostCard key={p.id} post={p} />
          ))}
        </div>
      )}
    </div>
  );
}
