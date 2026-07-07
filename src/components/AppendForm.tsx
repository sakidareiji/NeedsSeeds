"use client";

import { useRef, useState, useTransition } from "react";
import { appendToPost } from "@/lib/posts/actions";

/**
 * 本文への追記フォーム(F3-7)。追記促しへの応答用で、既存本文は変更できない。
 * 「わかる」が付いて編集ロックされた投稿でも追記だけは可能。
 */
export function AppendForm({ postId }: { postId: string }) {
  const formRef = useRef<HTMLFormElement>(null);
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const [pending, start] = useTransition();

  function submit(formData: FormData) {
    setError(null);
    start(async () => {
      const res = await appendToPost(postId, null, formData);
      if (res?.error) {
        setError(res.error);
      } else {
        formRef.current?.reset();
        setOpen(false);
        setDone(true);
      }
    });
  }

  if (done) {
    return (
      <p className="mt-2 text-xs text-brand-700">
        追記しました。AIが内容を再確認します。
      </p>
    );
  }

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="mt-2 inline-block text-xs font-medium text-brand-700 hover:underline"
      >
        本文に追記して応える
      </button>
    );
  }

  return (
    <form ref={formRef} action={submit} className="mt-3 space-y-2">
      <textarea
        name="text"
        required
        maxLength={500}
        rows={3}
        placeholder="状況の補足や、その後の変化などを書いてみてください(500字以内)"
        className="w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm"
      />
      {error && <p className="text-sm text-red-600">{error}</p>}
      <div className="flex gap-2">
        <button
          type="submit"
          disabled={pending}
          className="rounded-lg bg-brand-500 px-4 py-1.5 text-sm font-medium text-white hover:bg-brand-600 disabled:opacity-60"
        >
          {pending ? "追記中…" : "追記する"}
        </button>
        <button
          type="button"
          onClick={() => setOpen(false)}
          className="rounded-lg px-3 py-1.5 text-sm text-neutral-500"
        >
          やめる
        </button>
      </div>
    </form>
  );
}
