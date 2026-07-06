"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toggleEmpathy } from "@/lib/reactions/actions";

/**
 * F5「わかる」ボタン(トグル・楽観更新)。未ログインはログインへ誘導。
 * 自分自身の投稿には押せない(isOwnPost)。
 */
export function EmpathyButton({
  postId,
  initialCount,
  initialEmpathized,
  canReact,
  isOwnPost = false,
}: {
  postId: string;
  initialCount: number;
  initialEmpathized: boolean;
  canReact: boolean;
  isOwnPost?: boolean;
}) {
  const router = useRouter();
  const [count, setCount] = useState(initialCount);
  const [on, setOn] = useState(initialEmpathized);
  const [pending, start] = useTransition();

  function click() {
    if (isOwnPost) return;
    if (!canReact) {
      router.push("/login");
      return;
    }
    // 楽観更新
    const nextOn = !on;
    setOn(nextOn);
    setCount((c) => c + (nextOn ? 1 : -1));
    start(async () => {
      const res = await toggleEmpathy(postId);
      if (!res.error) {
        setOn(res.empathized);
        setCount(res.count);
      }
    });
  }

  return (
    <button
      type="button"
      onClick={click}
      disabled={pending || isOwnPost}
      aria-pressed={on}
      title={isOwnPost ? "自分の投稿には「わかる」を押せません" : undefined}
      className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-sm transition disabled:cursor-not-allowed disabled:opacity-60 ${
        on
          ? "border-brand-500 bg-brand-50 text-brand-700"
          : "border-neutral-300 text-neutral-600 hover:border-brand-300"
      }`}
    >
      <span aria-hidden>{on ? "💡" : "🤝"}</span>
      わかる
      <span className="tabular-nums">{count}</span>
    </button>
  );
}
