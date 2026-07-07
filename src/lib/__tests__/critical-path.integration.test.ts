// @vitest-environment node
/**
 * クリティカルパスの統合テスト(§7): 認証 → 投稿作成 → RLS。
 * ローカル Supabase(supabase start)に対して実行し、未起動なら自動スキップする。
 * メール確認は admin API(email_confirm: true)で済ませ、確認メールを介さない。
 */
import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { createClient } from "@supabase/supabase-js";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

function loadEnvLocal(): Record<string, string> {
  try {
    const txt = readFileSync(resolve(__dirname, "../../../.env.local"), "utf8");
    return Object.fromEntries(
      txt
        .split("\n")
        .map((l) => l.trim())
        .filter((l) => l && !l.startsWith("#") && l.includes("="))
        .map((l) => {
          const i = l.indexOf("=");
          return [l.slice(0, i).trim(), l.slice(i + 1).trim()] as const;
        })
    );
  } catch {
    return {};
  }
}

const env = { ...loadEnvLocal(), ...process.env };
const url = env.NEXT_PUBLIC_SUPABASE_URL ?? "";
const anonKey = env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "";
const serviceKey = env.SUPABASE_SERVICE_ROLE_KEY ?? "";

async function supabaseAvailable(): Promise<boolean> {
  if (!url || !anonKey || !serviceKey) return false;
  try {
    const res = await fetch(`${url}/auth/v1/health`, {
      headers: { apikey: anonKey },
    });
    return res.ok;
  } catch {
    return false;
  }
}

const available = await supabaseAvailable();

describe.skipIf(!available)("クリティカルパス: 認証→投稿→RLS", () => {
  const admin = createClient(url, serviceKey, {
    auth: { persistSession: false },
  });
  const email = `it-critical-${Date.now()}@example.com`;
  const password = "test-password-123";
  let userId = "";
  let postId = "";

  beforeAll(async () => {
    const { data, error } = await admin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { display_name: "統合テスト" },
    });
    if (error) throw error;
    userId = data.user.id;
  });

  afterAll(async () => {
    // 物理削除(FK の cascade でテスト投稿・プロフィールも消える)。
    if (userId) await admin.auth.admin.deleteUser(userId);
  });

  it("メール+パスワードでログインできる", async () => {
    const client = createClient(url, anonKey, {
      auth: { persistSession: false },
    });
    const { data, error } = await client.auth.signInWithPassword({
      email,
      password,
    });
    expect(error).toBeNull();
    expect(data.session).not.toBeNull();
  });

  it("登録トリガーで public.users にプロフィールが作られる(F1)", async () => {
    const { data } = await admin
      .from("users")
      .select("display_name, role")
      .eq("id", userId)
      .single();
    expect(data?.display_name).toBe("統合テスト");
    expect(data?.role).toBe("user");
  });

  it("本人は投稿を作成でき、即時公開される(F2)", async () => {
    const client = createClient(url, anonKey, {
      auth: { persistSession: false },
    });
    await client.auth.signInWithPassword({ email, password });

    const { data: cat } = await client
      .from("categories")
      .select("id")
      .limit(1)
      .single();
    expect(cat).not.toBeNull();

    const { data: post, error } = await client
      .from("posts")
      .insert({
        user_id: userId,
        category_id: cat!.id,
        title: "統合テストの困りごと",
        body: "統合テスト用の本文です。",
        severity: 3,
      })
      .select("id, status")
      .single();
    expect(error).toBeNull();
    expect(post?.status).toBe("published");
    postId = post!.id;
  });

  it("未ログインでも公開投稿を閲覧できる(RLS)", async () => {
    const anon = createClient(url, anonKey, {
      auth: { persistSession: false },
    });
    const { data } = await anon
      .from("posts")
      .select("id, title")
      .eq("id", postId)
      .maybeSingle();
    expect(data?.title).toBe("統合テストの困りごと");
  });

  it("未ログインは投稿を改変できない(RLS)", async () => {
    const anon = createClient(url, anonKey, {
      auth: { persistSession: false },
    });
    await anon.from("posts").update({ title: "改ざん" }).eq("id", postId);

    const { data } = await admin
      .from("posts")
      .select("title")
      .eq("id", postId)
      .single();
    expect(data?.title).toBe("統合テストの困りごと");
  });
});
