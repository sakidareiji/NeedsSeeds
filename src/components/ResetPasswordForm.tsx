"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

const MIN_LENGTH = 6;

/** 新しいパスワードの設定(F1)。再設定リンクで確立したセッションで更新する。 */
export function ResetPasswordForm() {
  const router = useRouter();
  const supabase = createClient();
  const [password, setPassword] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (password.length < MIN_LENGTH) {
      setError(`パスワードは${MIN_LENGTH}文字以上で入力してください`);
      return;
    }
    if (password !== confirmation) {
      setError("パスワードが一致しません");
      return;
    }

    setLoading(true);
    const { error } = await supabase.auth.updateUser({ password });
    setLoading(false);

    if (error) {
      setError(
        /same as the old password/i.test(error.message)
          ? "現在と同じパスワードは設定できません"
          : "パスワードを更新できませんでした。リンクの期限が切れている場合は、もう一度メールを送信してください。"
      );
      return;
    }

    setDone(true);
    // 更新したセッションをサーバー側にも反映してからトップへ。
    router.refresh();
    setTimeout(() => router.push("/"), 1200);
  }

  if (done) {
    return (
      <div className="mx-auto max-w-sm space-y-3">
        <h1 className="text-2xl font-bold">パスワードを変更しました</h1>
        <p className="rounded-xl bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
          そのままログインした状態です。トップページへ移動します…
        </p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-sm">
      <h1 className="mb-2 text-2xl font-bold">新しいパスワードの設定</h1>
      <p className="mb-6 text-sm leading-relaxed text-neutral-500">
        新しいパスワードを入力してください({MIN_LENGTH}文字以上)。
      </p>

      <form onSubmit={onSubmit} className="space-y-4">
        <div>
          <label className="mb-1 block text-sm font-medium" htmlFor="password">
            新しいパスワード
          </label>
          <input
            id="password"
            type="password"
            required
            minLength={MIN_LENGTH}
            autoComplete="new-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full rounded-lg border border-neutral-300 px-3 py-2"
          />
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium" htmlFor="confirmation">
            新しいパスワード(確認)
          </label>
          <input
            id="confirmation"
            type="password"
            required
            minLength={MIN_LENGTH}
            autoComplete="new-password"
            value={confirmation}
            onChange={(e) => setConfirmation(e.target.value)}
            className="w-full rounded-lg border border-neutral-300 px-3 py-2"
          />
        </div>

        {error && <p className="text-sm text-red-600">{error}</p>}

        <button
          type="submit"
          disabled={loading}
          className="w-full rounded-lg bg-brand-500 px-4 py-2 font-medium text-white hover:bg-brand-600 disabled:opacity-50"
        >
          {loading ? "更新中…" : "パスワードを変更する"}
        </button>
      </form>
    </div>
  );
}
