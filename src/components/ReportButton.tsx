"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { reportPost, REPORT_REASONS } from "@/lib/reports/actions";

/** F7 通報ボタン(理由選択式)。未ログインはログインへ誘導。 */
export function ReportButton({
  postId,
  canReact,
}: {
  postId: string;
  canReact: boolean;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState<string>(REPORT_REASONS[0].value);
  const [done, setDone] = useState<string | null>(null);
  const [pending, start] = useTransition();

  if (done) return <span className="text-xs text-neutral-400">{done}</span>;

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => (canReact ? setOpen(true) : router.push("/login"))}
        className="text-xs text-neutral-400 hover:text-red-600"
      >
        通報
      </button>
    );
  }

  return (
    <div className="flex items-center gap-2">
      <select
        value={reason}
        onChange={(e) => setReason(e.target.value)}
        className="rounded-lg border border-neutral-300 px-2 py-1 text-xs"
      >
        {REPORT_REASONS.map((r) => (
          <option key={r.value} value={r.value}>
            {r.label}
          </option>
        ))}
      </select>
      <button
        type="button"
        disabled={pending}
        onClick={() =>
          start(async () => {
            const res = await reportPost(postId, reason);
            if (res.ok) setDone(res.message ?? "通報しました");
          })
        }
        className="rounded-lg bg-neutral-700 px-2 py-1 text-xs text-white disabled:opacity-60"
      >
        送信
      </button>
      <button
        type="button"
        onClick={() => setOpen(false)}
        className="text-xs text-neutral-400"
      >
        やめる
      </button>
    </div>
  );
}
