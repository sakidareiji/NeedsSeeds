"use client";

import { useState, useTransition } from "react";
import { deactivateAccount } from "@/lib/profile/actions";

/** 退会ボタン(§5)。誤操作防止のため確認ダイアログを挟む。 */
export function DeactivateAccountButton() {
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function onDeactivate() {
    if (
      !confirm(
        "退会しますか?\n\nアカウントは削除され、元に戻せません。プロフィールは匿名化されますが、投稿した困りごとはサービス改善と他ユーザーの参考のため「退会したユーザー」名義で残ります。"
      )
    )
      return;
    startTransition(async () => {
      const res = await deactivateAccount();
      if (res?.error) setError(res.error);
    });
  }

  return (
    <div>
      <button
        type="button"
        onClick={onDeactivate}
        disabled={pending}
        className="text-sm text-neutral-400 hover:text-red-600 disabled:opacity-50"
      >
        {pending ? "退会処理中…" : "退会する"}
      </button>
      {error && <p className="mt-1 text-sm text-red-600">{error}</p>}
    </div>
  );
}
