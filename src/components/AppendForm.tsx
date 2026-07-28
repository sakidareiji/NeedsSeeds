"use client";

import { useState, useTransition } from "react";
import { appendToPost } from "@/lib/posts/actions";

type Step = "closed" | "input" | "confirm" | "done";

/**
 * 本文への追記フォーム(F3-7)。追記促しへの応答用で、既存本文は変更できない。
 * 「わかる」が付いて編集ロックされた投稿でも追記だけは可能。
 * 追記は後から編集・削除できないため、送信前に確認フェーズを挟む。
 */
export function AppendForm({ postId }: { postId: string }) {
  const [step, setStep] = useState<Step>("closed");
  const [text, setText] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();

  function toConfirm() {
    setError(null);
    if (!text.trim()) {
      setError("追記の内容を入力してください");
      return;
    }
    setStep("confirm");
  }

  function submit() {
    setError(null);
    const formData = new FormData();
    formData.set("text", text);
    start(async () => {
      const res = await appendToPost(postId, null, formData);
      if (res?.error) {
        setError(res.error);
        setStep("input"); // 上限超過などは書き直せるように入力へ戻す
      } else {
        setStep("done");
      }
    });
  }

  if (step === "done") {
    return (
      <p className="mt-2 text-xs text-brand-700">
        追記しました。AIが内容を再確認します。
      </p>
    );
  }

  if (step === "closed") {
    return (
      <button
        type="button"
        onClick={() => setStep("input")}
        className="mt-2 inline-block text-xs font-medium text-brand-700 hover:underline"
      >
        本文に追記して応える
      </button>
    );
  }

  if (step === "confirm") {
    const stamp = new Date().toLocaleDateString("ja-JP", {
      timeZone: "Asia/Tokyo",
    });
    return (
      <div className="mt-3 space-y-2">
        <p className="text-sm font-medium text-neutral-700">
          この内容で追記しますか?
        </p>
        <div className="whitespace-pre-wrap rounded-lg border border-neutral-200 bg-white px-3 py-2 text-sm text-neutral-800">
          {`【追記 ${stamp}】\n${text.trim()}`}
        </div>
        <p className="text-xs text-neutral-500">
          追記した内容は、あとから編集・削除できません。
        </p>
        {error && <p className="text-sm text-red-600">{error}</p>}
        <div className="flex gap-2">
          <button
            type="button"
            onClick={submit}
            disabled={pending}
            className="rounded-lg bg-brand-500 px-4 py-1.5 text-sm font-medium text-white hover:bg-brand-600 disabled:opacity-60"
          >
            {pending ? "追記中…" : "この内容で追記する"}
          </button>
          <button
            type="button"
            onClick={() => setStep("input")}
            disabled={pending}
            className="rounded-lg px-3 py-1.5 text-sm text-neutral-500"
          >
            書き直す
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="mt-3 space-y-2">
      <textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        required
        maxLength={500}
        rows={3}
        placeholder="状況の補足や、その後の変化などを書いてみてください(500字以内)"
        className="w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm"
      />
      {error && <p className="text-sm text-red-600">{error}</p>}
      <div className="flex gap-2">
        <button
          type="button"
          onClick={toConfirm}
          className="rounded-lg bg-brand-500 px-4 py-1.5 text-sm font-medium text-white hover:bg-brand-600"
        >
          内容を確認する
        </button>
        <button
          type="button"
          onClick={() => setStep("closed")}
          className="rounded-lg px-3 py-1.5 text-sm text-neutral-500"
        >
          やめる
        </button>
      </div>
    </div>
  );
}
