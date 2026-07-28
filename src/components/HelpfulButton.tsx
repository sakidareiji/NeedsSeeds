"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { markHelpful } from "@/lib/reactions/actions";

/** F6「私も解決した」(投稿者以外・1回のみ・取消不可)。投稿者へ追加加点。 */
export function HelpfulButton({
  postId,
  initialMarked,
  canReact,
}: {
  postId: string;
  initialMarked: boolean;
  canReact: boolean;
}) {
  const router = useRouter();
  const [marked, setMarked] = useState(initialMarked);
  const [pending, start] = useTransition();

  function click() {
    if (!canReact) {
      router.push("/login");
      return;
    }
    if (marked) return;
    setMarked(true);
    start(async () => {
      const res = await markHelpful(postId);
      if (res.error) {
        // 登録失敗時は楽観更新を取り消す。
        setMarked(false);
        return;
      }
      router.refresh();
    });
  }

  return (
    <button
      type="button"
      onClick={click}
      disabled={pending || marked}
      className="inline-flex items-center gap-1.5 rounded-full border border-neutral-300 px-3 py-1.5 text-sm text-neutral-600 hover:border-emerald-300 disabled:opacity-70"
    >
      <span aria-hidden>✅</span>
      {marked ? "解決に役立った" : "私も解決した"}
    </button>
  );
}
