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
  author: { id: string; display_name: string } | null;
};

export type PostDetail = PostListItem & {
  user_id: string;
  category_id: number;
  ai_status: string;
  updated_at: string;
};

const LIST_SELECT =
  "id, title, body, severity, frequency, empathy_count, quality_score, status, resolved_at, created_at, category:categories(id, slug, name), author:users(id, display_name)";

export type SortMode = "featured" | "new";

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
  const { data } = await query
    .order("created_at", { ascending: false })
    .limit(opts.sort === "new" ? limit : Math.max(limit, 100));

  const rows = (data ?? []) as unknown as PostListItem[];

  if (opts.sort === "new") return rows.slice(0, limit);

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
}

/** Fetch a single post by id. Respects RLS (published, or own post). */
export async function getPostById(id: string): Promise<PostDetail | null> {
  const supabase = createClient();
  const { data } = await supabase
    .from("posts")
    .select(
      "id, user_id, category_id, title, body, severity, frequency, empathy_count, quality_score, status, ai_status, resolved_at, created_at, updated_at, category:categories(id, slug, name), author:users(id, display_name)"
    )
    .eq("id", id)
    .maybeSingle();
  return (data as unknown as PostDetail) ?? null;
}
