import Link from "next/link";
import { redirect } from "next/navigation";
import { listPosts, type SortMode } from "@/lib/posts/queries";
import { getActiveCategories } from "@/lib/categories";
import { getCurrentProfile } from "@/lib/auth";
import { CategoryTabs } from "@/components/CategoryTabs";
import { SortTabs } from "@/components/SortTabs";
import { PostList } from "@/components/PostList";
import { PostedBanner } from "@/components/PostedBanner";

// 常に最新の投稿を反映(即時公開)。
export const dynamic = "force-dynamic";

export default async function HomePage({
  searchParams,
}: {
  searchParams: { sort?: string; posted?: string; page?: string; preview?: string };
}) {
  // 運営(admin)はトップを開くとそのまま運営画面へ(?preview=1 でユーザー向け表示)。
  const profile = await getCurrentProfile();
  const isAdminPreview = profile?.role === "admin" && searchParams.preview === "1";
  if (profile?.role === "admin" && !isAdminPreview) {
    redirect("/admin/top");
  }
  const user = profile;

  const sort: SortMode = searchParams.sort === "new" ? "new" : "featured";
  const page = Math.max(1, Number(searchParams.page) || 1);
  const [{ items: posts, hasMore }, categories] = await Promise.all([
    listPosts({ sort, page }),
    getActiveCategories(),
  ]);

  return (
    <div className="space-y-6">
      {isAdminPreview && (
        <div className="flex items-center justify-between rounded-xl border border-neutral-200 bg-neutral-50 px-4 py-2.5 text-sm text-neutral-600">
          <span>ユーザー向け画面をプレビュー中です</span>
          <Link href="/admin/top" className="font-medium text-brand-700 hover:underline">
            運営画面に戻る
          </Link>
        </div>
      )}

      {searchParams.posted === "1" && <PostedBanner />}

      {!user && (
        <section className="flex items-center justify-between gap-6 rounded-2xl bg-gradient-to-br from-brand-50 to-brand-100 p-8">
          <div>
            <h1 className="text-2xl font-bold text-brand-800">
              困りごとが解決に向かう場所
            </h1>
            <p className="mt-2 max-w-xl text-sm leading-relaxed text-brand-900/70">
              日々の「困った」を投稿すると、AIが解決のヒントを探します。
              共感が集まり、あなたの声が次の誰かの助けになります。
            </p>
            <div className="mt-5 flex items-center gap-4">
              <Link
                href="/signup"
                className="inline-block rounded-full bg-brand-500 px-6 py-2.5 text-sm font-medium text-white shadow-sm hover:bg-brand-600"
              >
                無料ではじめる
              </Link>
              <Link href="/login" className="text-sm text-brand-700 hover:underline">
                ログイン
              </Link>
            </div>
          </div>
          <span aria-hidden className="hidden select-none text-7xl sm:block">
            🌱
          </span>
        </section>
      )}

      <CategoryTabs categories={categories} />

      <div className="flex items-center justify-between">
        <h2 className="text-lg font-bold">みんなの困りごと</h2>
        <SortTabs basePath="/" sort={sort} />
      </div>

      <PostList
        posts={posts}
        hasMore={hasMore}
        page={page}
        basePath="/"
        sort={sort}
        currentUserId={user?.id ?? null}
        emptyMessage="まだ投稿がありません。最初の困りごとを投稿してみませんか?"
      />
    </div>
  );
}
