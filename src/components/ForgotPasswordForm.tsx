"use client";

import { useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";

/**
 * パスワード再設定メールの送信(F1)。
 *
 * 登録の有無に関わらず同じ結果を表示する。「このメールアドレスは登録されて
 * いません」と返すと、アカウントの存在を第三者に教えてしまうため。
 */
export function ForgotPasswordForm() {
  const supabase = createClient();
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      // メールのリンクは /auth/confirm で検証し、新パスワード入力画面へ送る。
      redirectTo: `${location.origin}/auth/confirm?next=/reset-password`,
    });
    setLoading(false);

    // 送信回数の制限だけは伝える(黙って失敗すると再送を繰り返してしまう)。
    if (error && /(rate limit|too many requests)/i.test(error.message)) {
      setError("送信回数の上限に達しました。しばらくしてからお試しください。");
      return;
    }
    setSent(true);
  }

  if (sent) {
    return (
      <div className="mx-auto max-w-sm space-y-4">
        <h1 className="text-2xl font-bold">メールを送信しました</h1>
        <p className="rounded-xl bg-emerald-50 px-4 py-3 text-sm leading-relaxed text-emerald-800">
          <strong className="font-medium">{email}</strong> 宛に、パスワード再設定の
          リンクを送りました。メール内のリンクを開いて、新しいパスワードを設定して
          ください。リンクの有効期限は1時間です。
        </p>
        <p className="text-sm text-neutral-500">
          メールが届かない場合は、迷惑メールフォルダをご確認ください。
          このメールアドレスで登録がない場合はメールは届きません。
        </p>
        <Link href="/login" className="text-sm text-brand-600 hover:underline">
          ログイン画面に戻る
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-sm">
      <h1 className="mb-2 text-2xl font-bold">パスワードの再設定</h1>
      <p className="mb-6 text-sm leading-relaxed text-neutral-500">
        登録したメールアドレスに、パスワード再設定のリンクをお送りします。
      </p>

      <form onSubmit={onSubmit} className="space-y-4">
        <div>
          <label className="mb-1 block text-sm font-medium" htmlFor="email">
            メールアドレス
          </label>
          <input
            id="email"
            type="email"
            required
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full rounded-lg border border-neutral-300 px-3 py-2"
          />
        </div>

        {error && <p className="text-sm text-red-600">{error}</p>}

        <button
          type="submit"
          disabled={loading}
          className="w-full rounded-lg bg-brand-500 px-4 py-2 font-medium text-white hover:bg-brand-600 disabled:opacity-50"
        >
          {loading ? "送信中…" : "再設定リンクを送る"}
        </button>
      </form>

      <p className="mt-6 text-center text-sm text-neutral-500">
        <Link href="/login" className="text-brand-600 hover:underline">
          ログイン画面に戻る
        </Link>
      </p>
    </div>
  );
}
