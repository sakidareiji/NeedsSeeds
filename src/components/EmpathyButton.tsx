"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toggleEmpathy } from "@/lib/reactions/actions";

/** F5「わかる」ボタン(トグル・楽観更新)。未ログインはログインへ誘導。 */
export function EmpathyButton({
  postId,
  initialCount,
  initialEmpathized,
  canReact,
}: {
  postId: string;
  initialCount: number;
  initialEmpathized: boolean;
  canReact: boolean;
}) {
  const router = useRouter();
  const [count, setCount] = useState(initialCount);
  const [on, setOn] = useState(initialEmpathized);
  const [pending, start] = useTransition();

  function click() {
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
      disabled={pending}
      aria-pressed={on}
      className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-sm transition disabled:opacity-60 ${
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
