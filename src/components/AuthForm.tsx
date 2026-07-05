"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";

type Mode = "login" | "signup";

export function AuthForm({ mode }: { mode: Mode }) {
  const router = useRouter();
  const supabase = createClient();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setMessage(null);
    setLoading(true);
    try {
      if (mode === "signup") {
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            // Read by the handle_new_user trigger to seed public.users.
            data: { display_name: displayName.trim() },
            emailRedirectTo: `${location.origin}/auth/callback`,
          },
        });
        if (error) throw error;
        // With email confirmation disabled (local), a session is returned.
        const { data } = await supabase.auth.getSession();
        if (data.session) {
          router.push("/");
          router.refresh();
        } else {
          setMessage("確認メールを送信しました。メール内のリンクから登録を完了してください。");
        }
      } else {
        const { error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });
        if (error) throw error;
        router.push("/");
        router.refresh();
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "エラーが発生しました");
    } finally {
      setLoading(false);
    }
  }

  async function signInWithGoogle() {
    setError(null);
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: `${location.origin}/auth/callback` },
    });
    if (error) setError(error.message);
  }

  return (
    <div className="mx-auto max-w-sm">
      <h1 className="mb-6 text-2xl font-bold">
        {mode === "signup" ? "新規登録" : "ログイン"}
      </h1>

      <button
        type="button"
        onClick={signInWithGoogle}
        className="mb-4 w-full rounded-lg border border-neutral-300 bg-white px-4 py-2 font-medium hover:bg-neutral-50"
      >
        Google で{mode === "signup" ? "登録" : "ログイン"}
      </button>

      <div className="my-4 flex items-center gap-3 text-sm text-neutral-400">
        <span className="h-px flex-1 bg-neutral-200" />
        または
        <span className="h-px flex-1 bg-neutral-200" />
      </div>

      <form onSubmit={onSubmit} className="space-y-4">
        {mode === "signup" && (
          <div>
            <label className="mb-1 block text-sm font-medium" htmlFor="display_name">
              表示名(ニックネーム)
            </label>
            <input
              id="display_name"
              type="text"
              required
              maxLength={40}
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              className="w-full rounded-lg border border-neutral-300 px-3 py-2"
              placeholder="実名は不要です"
            />
          </div>
        )}
        <div>
          <label className="mb-1 block text-sm font-medium" htmlFor="email">
            メールアドレス
          </label>
          <input
            id="email"
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full rounded-lg border border-neutral-300 px-3 py-2"
          />
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium" htmlFor="password">
            パスワード
          </label>
          <input
            id="password"
            type="password"
            required
            minLength={6}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full rounded-lg border border-neutral-300 px-3 py-2"
          />
        </div>

        {error && <p className="text-sm text-red-600">{error}</p>}
        {message && <p className="text-sm text-brand-700">{message}</p>}

        <button
          type="submit"
          disabled={loading}
          className="w-full rounded-lg bg-brand-500 px-4 py-2 font-medium text-white hover:bg-brand-600 disabled:opacity-50"
        >
          {loading ? "処理中…" : mode === "signup" ? "登録する" : "ログイン"}
        </button>
      </form>

      <p className="mt-6 text-center text-sm text-neutral-500">
        {mode === "signup" ? (
          <>
            すでにアカウントをお持ちですか?{" "}
            <Link href="/login" className="text-brand-600 hover:underline">
              ログイン
            </Link>
          </>
        ) : (
          <>
            アカウントがありませんか?{" "}
            <Link href="/signup" className="text-brand-600 hover:underline">
              新規登録
            </Link>
          </>
        )}
      </p>
    </div>
  );
}
