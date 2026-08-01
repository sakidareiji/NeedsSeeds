"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";

type Mode = "login" | "signup";

/** Supabase auth の主要な英語エラーを日本語にマップ。未知のものはそのまま表示。 */
function toJaAuthError(message: string): string {
  const map: [RegExp, string][] = [
    [/invalid login credentials/i, "メールアドレスまたはパスワードが正しくありません"],
    [/email not confirmed/i, "メールアドレスが未確認です。確認メールのリンクを開いてください"],
    [/user already registered/i, "このメールアドレスは既に登録されています"],
    [/password should be at least/i, "パスワードは6文字以上で入力してください"],
    [/(rate limit|too many requests)/i, "試行回数が多すぎます。しばらくしてからお試しください"],
    [/unable to validate email|invalid email/i, "メールアドレスの形式が正しくありません"],
  ];
  return map.find(([re]) => re.test(message))?.[1] ?? message;
}

// Google プロバイダを Supabase 側で有効化したときだけ true にする。
// 未設定のまま Google ボタンを押すと "Unsupported provider" エラーになるため、
// 有効時のみボタンを表示する(仕様上 Google OAuth は任意)。
const GOOGLE_ENABLED =
  process.env.NEXT_PUBLIC_GOOGLE_AUTH_ENABLED === "true";

export function AuthForm({ mode }: { mode: Mode }) {
  const router = useRouter();
  const supabase = createClient();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  // 未確認メールでのログイン失敗時に、確認メールの再送を案内する。
  const [showResend, setShowResend] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setMessage(null);
    setShowResend(false);
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
      setError(
        err instanceof Error ? toJaAuthError(err.message) : "エラーが発生しました"
      );
      if (err instanceof Error && /email not confirmed/i.test(err.message)) {
        setShowResend(true);
      }
    } finally {
      setLoading(false);
    }
  }

  async function resendConfirmation() {
    setError(null);
    const { error } = await supabase.auth.resend({ type: "signup", email });
    if (error) {
      setError(toJaAuthError(error.message));
    } else {
      setShowResend(false);
      setMessage("確認メールを再送しました。メール内のリンクを開いてください。");
    }
  }

  async function signInWithGoogle() {
    setError(null);
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: `${location.origin}/auth/callback` },
    });
    if (error) setError(toJaAuthError(error.message));
  }

  return (
    <div className="mx-auto max-w-sm">
      <h1 className="mb-6 text-2xl font-bold">
        {mode === "signup" ? "新規登録" : "ログイン"}
      </h1>

      {GOOGLE_ENABLED && (
        <>
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
        </>
      )}

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
          <div className="mb-1 flex items-baseline justify-between gap-2">
            <label className="block text-sm font-medium" htmlFor="password">
              パスワード
            </label>
            {mode === "login" && (
              <Link
                href="/forgot-password"
                className="text-xs text-brand-600 hover:underline"
              >
                パスワードをお忘れですか?
              </Link>
            )}
          </div>
          <input
            id="password"
            type="password"
            required
            minLength={6}
            autoComplete={mode === "signup" ? "new-password" : "current-password"}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full rounded-lg border border-neutral-300 px-3 py-2"
          />
        </div>

        {error && <p className="text-sm text-red-600">{error}</p>}
        {message && <p className="text-sm text-brand-700">{message}</p>}
        {showResend && (
          <button
            type="button"
            onClick={resendConfirmation}
            className="text-sm text-brand-600 hover:underline"
          >
            確認メールを再送する
          </button>
        )}

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
