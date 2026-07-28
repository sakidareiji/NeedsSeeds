import { cache } from "react";
import { createClient } from "@/lib/supabase/server";
import { getAuthUser } from "@/lib/auth";

export type PostListItem = {
  id: string;
  title: string;
  body: string;
  severity: number;
  frequency: string | null;
  empathy_count: number;
  status: string;
  resolved_at: string | null;
  created_at: string;
  category: { id: number; slug: string; name: string } | null;
  author: {
    id: string;
    display_name: string;
    contribution_score: number;
    role: string;
  } | null;
  /** 閲覧者自身がこの投稿に「わかる」を付けているか(未ログイン時は false)。 */
  viewer_empathized: boolean;
};

export type PostDetail = PostListItem & {
  user_id: string;
  category_id: number;
  ai_status: string;
  updated_at: string;
  resolved_by: "solution" | "self" | "other" | null;
  resolution_note: string | null;
};

export const LIST_SELECT =
  "id, title, body, severity, frequency, empathy_count, status, resolved_at, created_at, category:categories(id, slug, name), author:users(id, display_name, contribution_score, role)";

export type SortMode = "featured" | "new";

/** LIKE のメタ文字を打ち消す(検索語をそのまま部分一致に使うため)。 */
function escapeLikePattern(q: string): string {
  return q.replace(/[\\%_]/g, (m) => `\\${m}`).trim();
}

/**
 * 一覧に出す投稿の id を、指定の並びで DB から受け取る(0019 の feed_post_ids)。
 *
 * 並び替え・運営投稿の除外・ページングは全て DB 側で行う。アプリ側で窓を切って
 * ソートしていた頃と違い、窓より古い高共感の投稿が落ちることも、ページ境界が
 * ずれることもない。注目順の重みと quality_score は関数の内側に閉じている。
 */
async function feedPostIds(
  supabase: ReturnType<typeof createClient>,
  opts: {
    sort: SortMode;
    categoryId?: number | null;
    search?: string | null;
    excludePostId?: string | null;
    limit: number;
    offset?: number;
  }
): Promise<string[]> {
  const { data } = await supabase.rpc("feed_post_ids", {
    p_sort: opts.sort,
    p_category_id: opts.categoryId ?? null,
    p_search: opts.search || null,
    p_exclude_post_id: opts.excludePostId ?? null,
    p_limit: opts.limit,
    p_offset: opts.offset ?? 0,
  });
  return data ?? [];
}

/** id の並びを保ったまま、一覧表示に必要な列を取得する(RLS 経由)。 */
async function fetchListItems(
  supabase: ReturnType<typeof createClient>,
  ids: string[]
): Promise<Omit<PostListItem, "viewer_empathized">[]> {
  if (ids.length === 0) return [];
  const { data } = await supabase.from("posts").select(LIST_SELECT).in("id", ids);
  const rows = (data ?? []) as unknown as Omit<PostListItem, "viewer_empathized">[];
  const byId = new Map(rows.map((r) => [r.id, r]));
  return ids
    .map((id) => byId.get(id))
    .filter((r): r is Omit<PostListItem, "viewer_empathized"> => Boolean(r));
}

/**
 * 一覧の各投稿に、閲覧者自身の「わかる」状態を付与する(未ログイン時は全て false)。
 * listPosts() と、独自にクエリを組む画面(プロフィール等)の両方から呼ぶ。
 */
export async function attachViewerEmpathized(
  supabase: ReturnType<typeof createClient>,
  items: Omit<PostListItem, "viewer_empathized">[]
): Promise<PostListItem[]> {
  if (items.length === 0) return [];
  // cache() 済みの getAuthUser() を使い、ページ本体の認証チェックと
  // 認証サーバーへの往復を1回に畳む。
  const user = await getAuthUser();
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

export type PostListPage = { items: PostListItem[]; hasMore: boolean };

/** Fetch published posts for a list view, optionally filtered by category. */
export async function listPosts(opts: {
  categorySlug?: string;
  sort?: SortMode;
  limit?: number;
  /** 1始まりのページ番号(既定: 1)。 */
  page?: number;
  /** キーワード検索(タイトル・本文の部分一致)。 */
  searchQuery?: string;
}): Promise<PostListPage> {
  const supabase = createClient();
  const limit = opts.limit ?? 30;
  const page = Math.max(1, opts.page ?? 1);

  let categoryId: number | null = null;
  if (opts.categorySlug) {
    const { data: cat } = await supabase
      .from("categories")
      .select("id")
      .eq("slug", opts.categorySlug)
      .single();
    if (!cat) return { items: [], hasMore: false };
    categoryId = cat.id;
  }

  // 並び・運営投稿の除外・ページングは DB 側(0019)。次ページの有無を知るため
  // 1件多く要求する。
  const ids = await feedPostIds(supabase, {
    sort: opts.sort ?? "featured",
    categoryId,
    search: opts.searchQuery ? escapeLikePattern(opts.searchQuery) : null,
    limit: limit + 1,
    offset: (page - 1) * limit,
  });

  const hasMore = ids.length > limit;
  const items = await fetchListItems(supabase, ids.slice(0, limit));

  return {
    items: await attachViewerEmpathized(supabase, items),
    hasMore,
  };
}

export type RelatedPost = {
  id: string;
  title: string;
  empathy_count: number;
  resolved_at: string | null;
};

/**
 * 投稿詳細の「関連する困りごと」(SEO内部リンク)。同カテゴリの公開投稿を
 * 注目順(quality/empathy加重)で返す。自分自身と運営投稿は除外。
 */
export async function listRelatedPosts(
  post: { id: string; category_id: number },
  limit = 5
): Promise<RelatedPost[]> {
  const supabase = createClient();
  // 一覧と同じ並び(0019)。同カテゴリ・自分自身と運営投稿の除外も DB 側で行う。
  const ids = await feedPostIds(supabase, {
    sort: "featured",
    categoryId: post.category_id,
    excludePostId: post.id,
    limit,
  });
  if (ids.length === 0) return [];

  const { data } = await supabase
    .from("posts")
    .select("id, title, empathy_count, resolved_at")
    .in("id", ids);

  const byId = new Map(
    ((data ?? []) as unknown as RelatedPost[]).map((r) => [r.id, r])
  );
  return ids
    .map((id) => byId.get(id))
    .filter((r): r is RelatedPost => Boolean(r));
}

export type SimilarSolvedPost = {
  id: string;
  title: string;
  resolvedBy: string | null;
  resolutionNote: string;
  empathyCount: number;
};

/**
 * 「同じ悩みを解決した人」(F6 の解決報告)を回答エリアに添えるための取得。
 * 同カテゴリの公開・解決済み(解決方法の記述あり)投稿から、AI解析の sub_tags
 * (悩みの細分タグ)の一致度が高い順に返す。タグは公開ビュー post_public_analysis
 * 経由(quality 等の非公開情報は出さない)。運営投稿・自分自身は除外。
 */
export async function listSimilarSolvedPosts(
  post: { id: string; category_id: number },
  limit = 3
): Promise<SimilarSolvedPost[]> {
  const supabase = createClient();

  // 候補: 同カテゴリの解決済み(解決方法の記述あり)公開投稿。
  const { data: cand } = await supabase
    .from("posts")
    .select(
      "id, title, resolved_by, resolution_note, empathy_count, created_at, author:users(role)"
    )
    .eq("status", "published")
    .eq("category_id", post.category_id)
    .neq("id", post.id)
    .not("resolved_at", "is", null)
    .not("resolution_note", "is", null)
    .order("created_at", { ascending: false })
    .limit(50);

  type Row = {
    id: string;
    title: string;
    resolved_by: string | null;
    resolution_note: string | null;
    empathy_count: number;
    created_at: string;
    author: { role: string } | null;
  };
  const rows = ((cand ?? []) as unknown as Row[]).filter(
    (r) => r.author?.role !== "admin" && r.resolution_note
  );
  if (rows.length === 0) return [];

  // 現在の投稿+候補の sub_tags をまとめて取得し、タグ一致数でランク付けする。
  const ids = [post.id, ...rows.map((r) => r.id)];
  const { data: tagRows } = await supabase
    .from("post_public_analysis")
    .select("post_id, sub_tags")
    .in("post_id", ids);

  const tagMap = new Map<string, string[]>();
  for (const t of (tagRows ?? []) as { post_id: string; sub_tags: unknown }[]) {
    tagMap.set(
      t.post_id,
      Array.isArray(t.sub_tags) ? (t.sub_tags as string[]) : []
    );
  }
  const currentTags = new Set(tagMap.get(post.id) ?? []);

  return rows
    .map((r) => {
      const tags = tagMap.get(r.id) ?? [];
      const overlap = tags.reduce((n, t) => n + (currentTags.has(t) ? 1 : 0), 0);
      return { r, overlap };
    })
    // タグ一致数 → 共感数 → 新しさ の優先度で並べる。
    .sort(
      (a, b) =>
        b.overlap - a.overlap ||
        b.r.empathy_count - a.r.empathy_count ||
        +new Date(b.r.created_at) - +new Date(a.r.created_at)
    )
    .slice(0, limit)
    .map(({ r }) => ({
      id: r.id,
      title: r.title,
      resolvedBy: r.resolved_by,
      resolutionNote: r.resolution_note as string,
      empathyCount: r.empathy_count,
    }));
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
        "id, user_id, category_id, title, body, severity, frequency, empathy_count, status, ai_status, resolved_at, resolved_by, resolution_note, created_at, updated_at, category:categories(id, slug, name), author:users(id, display_name, contribution_score, role)"
      )
      .eq("id", id)
      .maybeSingle();
    return (data as unknown as PostDetail) ?? null;
  }
);
