// @vitest-environment node
/**
 * 一覧の並び(0019 feed_post_ids)の統合テスト。
 * ランキングは SQL 側にあるので、実際の DB に対して順序の性質を検証する。
 * ローカル Supabase(supabase start)が無ければ自動スキップする。
 *
 * 既存データと混ざらないよう、テスト用ユーザーの投稿だけを取り出して
 * **相対順序**を検証する(絶対順位には依存しない)。
 */
import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { createClient } from "@supabase/supabase-js";
import {
  url,
  serviceKey,
  supabaseAvailable,
  FALLBACK_URL,
  FALLBACK_KEY,
} from "./helpers/local-supabase";

const available = await supabaseAvailable();

describe.skipIf(!available)("一覧の並び(feed_post_ids)", () => {
  const admin = createClient(url || FALLBACK_URL, serviceKey || FALLBACK_KEY, {
    auth: { persistSession: false },
  });

  const email = `it-ranking-${Date.now()}@example.com`;
  let userId = "";
  let categoryId = 0;
  const posts: Record<string, string> = {}; // ラベル -> post id

  /** テスト投稿を作る(created_at / 共感数 / 査定値はサービスロールで直接指定)。 */
  async function seedPost(
    label: string,
    values: {
      empathy_count?: number;
      quality_score?: number | null;
      hours_ago?: number;
    }
  ) {
    const createdAt = new Date(
      Date.now() - (values.hours_ago ?? 0) * 3600 * 1000
    ).toISOString();
    const { data, error } = await admin
      .from("posts")
      .insert({
        user_id: userId,
        category_id: categoryId,
        title: `並び順テスト ${label}`,
        body: "並び順の検証のための投稿です。",
        severity: 3,
        status: "published",
        ai_status: "done",
        empathy_count: values.empathy_count ?? 0,
        quality_score: values.quality_score ?? null,
        created_at: createdAt,
      })
      .select("id")
      .single();
    if (error) throw error;
    posts[label] = data.id;
  }

  /** 注目順の結果から、テストで作った投稿だけを順番どおりに抜き出す。 */
  async function rankedLabels(sort: "featured" | "new"): Promise<string[]> {
    const { data, error } = await admin.rpc("feed_post_ids", {
      p_sort: sort,
      p_limit: 500,
    });
    if (error) throw error;
    const labelOf = new Map(Object.entries(posts).map(([l, id]) => [id, l]));
    const ids: string[] = data ?? [];
    return ids
      .map((id) => labelOf.get(id))
      .filter((l): l is string => Boolean(l));
  }

  const before = (labels: string[], a: string, b: string) =>
    labels.indexOf(a) < labels.indexOf(b);

  beforeAll(async () => {
    const { data: user, error } = await admin.auth.admin.createUser({
      email,
      password: "test-password-123",
      email_confirm: true,
      user_metadata: { display_name: "並び順テスト" },
    });
    if (error) throw error;
    userId = user.user.id;

    const { data: cat } = await admin
      .from("categories")
      .select("id")
      .limit(1)
      .single();
    categoryId = cat!.id;

    // 同時刻・同共感数で査定値だけ違う組
    await seedPost("quality-high", { quality_score: 90 });
    await seedPost("quality-low", { quality_score: 10 });
    await seedPost("quality-none", { quality_score: null });
    await seedPost("quality-zero", { quality_score: 0 });
    // 査定値・時刻が同じで共感数だけ違う組
    await seedPost("empathy-many", { quality_score: 50, empathy_count: 50 });
    await seedPost("empathy-none", { quality_score: 50, empathy_count: 0 });
    // 査定値・共感数が同じで新しさだけ違う組(半減期48h)
    await seedPost("recent", { quality_score: 50, hours_ago: 0 });
    await seedPost("old", { quality_score: 50, hours_ago: 24 * 30 });
  });

  afterAll(async () => {
    // ユーザーを消せば FK cascade でテスト投稿も消える。
    if (userId) await admin.auth.admin.deleteUser(userId);
  });

  it("査定値が高い投稿が上に来る", async () => {
    const labels = await rankedLabels("featured");
    expect(before(labels, "quality-high", "quality-low")).toBe(true);
  });

  it("未査定(null)は 0 点ではなく中立として扱う", async () => {
    const labels = await rankedLabels("featured");
    expect(before(labels, "quality-none", "quality-zero")).toBe(true);
  });

  it("共感が多い投稿が上に来る", async () => {
    const labels = await rankedLabels("featured");
    expect(before(labels, "empathy-many", "empathy-none")).toBe(true);
  });

  it("新しい投稿が上に来る(時間減衰)", async () => {
    const labels = await rankedLabels("featured");
    expect(before(labels, "recent", "old")).toBe(true);
  });

  it("新着順は作成日時の降順になる", async () => {
    const labels = await rankedLabels("new");
    expect(before(labels, "recent", "old")).toBe(true);
    // 注目順では上位だった高査定の投稿も、新着順では作成順に従う。
    expect(labels[labels.length - 1]).toBe("old");
  });

  it("運営(admin)の投稿は一覧に出ない", async () => {
    await admin.from("users").update({ role: "admin" }).eq("id", userId);
    try {
      const labels = await rankedLabels("featured");
      expect(labels).toHaveLength(0);
    } finally {
      await admin.from("users").update({ role: "user" }).eq("id", userId);
    }
  });

  it("ページングが重複せず続きを返す", async () => {
    const page = async (offset: number) => {
      const { data } = await admin.rpc("feed_post_ids", {
        p_sort: "featured",
        p_limit: 3,
        p_offset: offset,
      });
      return data ?? [];
    };
    const [first, second] = await Promise.all([page(0), page(3)]);
    expect(first).toHaveLength(3);
    expect(first.some((id: string) => second.includes(id))).toBe(false);
  });

  it("カテゴリと除外指定が効く", async () => {
    const { data } = await admin.rpc("feed_post_ids", {
      p_sort: "featured",
      p_category_id: categoryId,
      p_exclude_post_id: posts["quality-high"],
      p_limit: 500,
    });
    expect(data).not.toContain(posts["quality-high"]);
    expect(data).toContain(posts["quality-low"]);
  });

  it("検索語がタイトル・本文に部分一致する", async () => {
    const { data } = await admin.rpc("feed_post_ids", {
      p_sort: "new",
      p_search: "並び順テスト quality-high",
      p_limit: 500,
    });
    expect(data).toEqual([posts["quality-high"]]);
  });
});
