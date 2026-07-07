import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { listPosts, parseAuthorFilter, type SortMode } from "@/lib/posts/queries";
import { getActiveCategories } from "@/lib/categories";
import { getAuthUser } from "@/lib/auth";
import { PostCard } from "@/components/PostCard";
import { CategoryTabs } from "@/components/CategoryTabs";
import { SortTabs } from "@/components/SortTabs";
import { AuthorFilterTabs } from "@/components/AuthorFilterTabs";

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
  searchParams: { sort?: string; from?: string };
}) {
  const categories = await getActiveCategories();
  const cat = categories.find((c) => c.slug === params.category);
  if (!cat) notFound();

  const sort: SortMode = searchParams.sort === "new" ? "new" : "featured";
  const from = parseAuthorFilter(searchParams.from);
  const [posts, user] = await Promise.all([
    listPosts({ categorySlug: cat.slug, sort, authorFilter: from }),
    getAuthUser(),
  ]);

  return (
    <div className="space-y-6">
      <CategoryTabs categories={categories} activeSlug={cat.slug} />
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h1 className="text-lg font-bold">{cat.name}の困りごと</h1>
        <div className="flex items-center gap-4">
          <AuthorFilterTabs basePath={`/c/${cat.slug}`} sort={sort} from={from} />
          <span aria-hidden className="h-4 w-px bg-neutral-200" />
          <SortTabs basePath={`/c/${cat.slug}`} sort={sort} from={from} />
        </div>
      </div>
      {posts.length === 0 ? (
        <p className="py-12 text-center text-sm text-neutral-500">
          このカテゴリにはまだ投稿がありません。
        </p>
      ) : (
        <div className="grid gap-3 lg:grid-cols-2">
          {posts.map((p) => (
            <PostCard key={p.id} post={p} currentUserId={user?.id ?? null} />
          ))}
        </div>
      )}
    </div>
  );
}
