"use client";

import { useTransition } from "react";
import { deletePost } from "@/lib/posts/actions";

export function DeletePostButton({ postId }: { postId: string }) {
  const [pending, startTransition] = useTransition();

  function onDelete() {
    if (!confirm("この投稿を削除しますか?この操作は取り消せません。")) return;
    startTransition(async () => {
      await deletePost(postId);
    });
  }

  return (
    <button
      type="button"
      onClick={onDelete}
      disabled={pending}
      className="text-sm text-neutral-400 hover:text-red-600 disabled:opacity-50"
    >
      {pending ? "削除中…" : "削除"}
    </button>
  );
}
