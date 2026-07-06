import { cache } from "react";
import { createClient } from "@/lib/supabase/server";
import { featuredScore } from "@config/ranking";

export type PostListItem = {
  id: string;
  title: string;
  body: string;
  severity: number;
  frequency: string | null;
  empathy_count: number;
  quality_score: number | null;
  status: string;
  resolved_at: string | null;
  created_at: string;
  category: { id: number; slug: string; name: string } | null;
  author: { id: string; display_name: string; contribution_score: number } | null;
  /** 閲覧者自身がこの投稿に「わかる」を付けているか(未ログイン時は false)。 */
  viewer_empathized: boolean;
};

export type PostDetail = PostListItem & {
  user_id: string;
  category_id: number;
  ai_status: string;
  updated_at: string;
};

export const LIST_SELECT =
  "id, title, body, severity, frequency, empathy_count, quality_score, status, resolved_at, created_at, category:categories(id, slug, name), author:users(id, display_name, contribution_score)";

export type SortMode = "featured" | "new";

/**
 * 一覧の各投稿に、閲覧者自身の「わかる」状態を付与する(未ログイン時は全て false)。
 * listPosts() と、独自にクエリを組む画面(プロフィール等)の両方から呼ぶ。
 */
export async function attachViewerEmpathized(
  supabase: ReturnType<typeof createClient>,
  items: Omit<PostListItem, "viewer_empathized">[]
): Promise<PostListItem[]> {
  if (items.length === 0) return [];
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return items.map((p) => ({ ...p, viewer_empathized: false }));

  const { data } = await supabase
    .from("empathies")
    .select("post_id")
    .eq("user_id", user.id)
    .in(
      "post_id",
      items.map((p) => p.id)
    );
  const empathized = new Set((data ?? []).map((e) => e.post_id));
  return items.map((p) => ({ ...p, viewer_empathized: empathized.has(p.id) }));
}

/** Fetch published posts for a list view, optionally filtered by category. */
export async function listPosts(opts: {
  categorySlug?: string;
  sort?: SortMode;
  limit?: number;
}): Promise<PostListItem[]> {
  const supabase = createClient();
  const limit = opts.limit ?? 30;

  let query = supabase
    .from("posts")
    .select(LIST_SELECT)
    .eq("status", "published");

  if (opts.categorySlug) {
    const { data: cat } = await supabase
      .from("categories")
      .select("id")
      .eq("slug", opts.categorySlug)
      .single();
    if (!cat) return [];
    query = query.eq("category_id", cat.id);
  }

  // Over-fetch a window, then sort. 注目順(F11)は quality_score / empathy を
  // 加味するため、新着で広めに取得してからアプリ側で加重ソートする。
  // NOTE(M2): 窓が新着100件固定のため、それより古い高共感投稿はランク外に
  // 落ちる。投稿数が増えたらスコアを DB 側にマテリアライズして order by する。
  const { data } = await query
    .order("created_at", { ascending: false })
    .limit(opts.sort === "new" ? limit : Math.max(limit, 100));

  const rows = (data ?? []) as unknown as Omit<PostListItem, "viewer_empathized">[];

  const final =
    opts.sort === "new"
      ? rows.slice(0, limit)
      : (() => {
          const now = new Date();
          return rows
            .map((p) => ({
              p,
              score: featuredScore({
                createdAt: new Date(p.created_at),
                empathyCount: p.empathy_count,
                qualityScore: p.quality_score,
                now,
              }),
            }))
            .sort((a, b) => b.score - a.score)
            .slice(0, limit)
            .map(({ p }) => p);
        })();

  return attachViewerEmpathized(supabase, final);
}

/**
 * Fetch a single post by id. Respects RLS (published, or own post).
 * cache() dedupes the generateMetadata + page fetch within one request.
 */
export const getPostById = cache(
  async (id: string): Promise<PostDetail | null> => {
    const supabase = createClient();
    const { data } = await supabase
      .from("posts")
      .select(
        "id, user_id, category_id, title, body, severity, frequency, empathy_count, quality_score, status, ai_status, resolved_at, created_at, updated_at, category:categories(id, slug, name), author:users(id, display_name, contribution_score)"
      )
      .eq("id", id)
      .maybeSingle();
    return (data as unknown as PostDetail) ?? null;
  }
);
