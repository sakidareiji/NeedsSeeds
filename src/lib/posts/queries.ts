import { cache } from "react";
import { createClient } from "@/lib/supabase/server";
import { getAuthUser } from "@/lib/auth";
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
  "id, title, body, severity, frequency, empathy_count, quality_score, status, resolved_at, created_at, category:categories(id, slug, name), author:users(id, display_name, contribution_score, role)";

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
    if (!cat) return { items: [], hasMore: false };
    query = query.eq("category_id", cat.id);
  }

  if (opts.searchQuery) {
    // ilike のパターン文字をエスケープし、or() の区切り文字(カンマ・括弧)は
    // 空白に置き換える(PostgREST のフィルタ構文を壊さないため)。
    const escaped = opts.searchQuery
      .replace(/[\\%_]/g, (m) => `\\${m}`)
      .replace(/[,()]/g, " ")
      .trim();
    if (escaped) {
      query = query.or(`title.ilike.%${escaped}%,body.ilike.%${escaped}%`);
    }
  }

  // Over-fetch a window, then sort. 注目順(F11)は quality_score / empathy を
  // 加味するため、新着で広めに取得してからアプリ側で加重ソートする。
  // ページングも窓の中で行う(admin除外がアプリ側フィルタのため、DBの
  // range() では正確なページ境界を切れない)。
  // NOTE(M2): それより古い高共感投稿はランク外に落ちる。投稿数が増えたら
  // スコアを DB 側にマテリアライズして order by / range する。
  const windowSize = Math.max(100, page * limit + 1);
  const { data } = await query
    .order("created_at", { ascending: false })
    .limit(windowSize);

  const fetched = (data ?? []) as unknown as Omit<PostListItem, "viewer_empathized">[];

  // 運営(admin)アカウントの投稿はユーザー向け一覧に出さない(運用・テスト投稿の混入防止)。
  // 種投稿(seed)はコールドスタート用コンテンツなので表示する。
  const rows = fetched.filter((p) => p.author?.role !== "admin");

  const sorted =
    opts.sort === "new"
      ? rows
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
            .map(({ p }) => p);
        })();

  const pageItems = sorted.slice((page - 1) * limit, page * limit);
  const hasMore = sorted.length > page * limit;

  return {
    items: await attachViewerEmpathized(supabase, pageItems),
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
  // 一覧(listPosts)と同様、admin除外がアプリ側フィルタのため広めに取得する。
  const { data } = await supabase
    .from("posts")
    .select(
      "id, title, empathy_count, quality_score, resolved_at, created_at, author:users(role)"
    )
    .eq("status", "published")
    .eq("category_id", post.category_id)
    .neq("id", post.id)
    .order("created_at", { ascending: false })
    .limit(Math.max(30, limit * 4));

  type Row = RelatedPost & {
    quality_score: number | null;
    created_at: string;
    author: { role: string } | null;
  };
  const rows = ((data ?? []) as unknown as Row[]).filter(
    (p) => p.author?.role !== "admin"
  );

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
    .map(({ p }) => ({
      id: p.id,
      title: p.title,
      empathy_count: p.empathy_count,
      resolved_at: p.resolved_at,
    }));
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
        "id, user_id, category_id, title, body, severity, frequency, empathy_count, quality_score, status, ai_status, resolved_at, resolved_by, resolution_note, created_at, updated_at, category:categories(id, slug, name), author:users(id, display_name, contribution_score, role)"
      )
      .eq("id", id)
      .maybeSingle();
    return (data as unknown as PostDetail) ?? null;
  }
);
