"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { reportResolution } from "@/lib/reactions/actions";
import type { ResolvedBy } from "@/lib/database.types";

type PresentedSolution = { id: string; name: string };

/** F6 解決報告 UI(投稿者のみ)。何で解決したかを選択、提示解決策なら該当を選ぶ。 */
export function ResolutionReport({
  postId,
  presentedSolutions,
}: {
  postId: string;
  presentedSolutions: PresentedSolution[];
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [resolvedBy, setResolvedBy] = useState<ResolvedBy>("solution");
  const [solutionId, setSolutionId] = useState<string>(
    presentedSolutions[0]?.id ?? ""
  );
  const [note, setNote] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();

  const hasSolutions = presentedSolutions.length > 0;
  // 構造化された解決策を持たない解決方法は自由記述で残す(自力は必須)。
  const needsNote = resolvedBy === "self" || resolvedBy === "other";

  function submit() {
    setError(null);
    if (resolvedBy === "self" && !note.trim()) {
      setError("どうやって解決したかを記入してください");
      return;
    }
    start(async () => {
      const res = await reportResolution(postId, {
        resolvedBy,
        solutionId: resolvedBy === "solution" ? solutionId || null : null,
        note: needsNote ? note : null,
      });
      if (res.ok) {
        router.refresh();
      } else {
        setError(res.error ?? "エラーが発生しました");
      }
    });
  }

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="rounded-full border border-emerald-300 px-3 py-1.5 text-sm text-emerald-700 hover:bg-emerald-50"
      >
        解決した
      </button>
    );
  }

  const OPTIONS: { value: ResolvedBy; label: string; disabled?: boolean }[] = [
    { value: "solution", label: "提示された解決策で解決", disabled: !hasSolutions },
    { value: "self", label: "自力で解決" },
    { value: "other", label: "その他" },
  ];

  return (
    <div className="w-full rounded-xl border border-emerald-200 bg-emerald-50/50 p-4">
      <p className="mb-2 text-sm font-medium text-emerald-800">
        何で解決しましたか?
      </p>
      <div className="space-y-2">
        {OPTIONS.map((o) => (
          <label
            key={o.value}
            className={`flex items-center gap-2 text-sm ${o.disabled ? "text-neutral-400" : ""}`}
          >
            <input
              type="radio"
              name="resolved_by"
              value={o.value}
              disabled={o.disabled}
              checked={resolvedBy === o.value}
              onChange={() => setResolvedBy(o.value)}
              className="accent-emerald-600"
            />
            {o.label}
          </label>
        ))}

        {resolvedBy === "solution" && hasSolutions && (
          <select
            value={solutionId}
            onChange={(e) => setSolutionId(e.target.value)}
            className="mt-1 w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm"
          >
            {presentedSolutions.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>
        )}

        {needsNote && (
          <div className="mt-1">
            <label
              htmlFor="resolution_note"
              className="mb-1 block text-sm text-emerald-800"
            >
              どうやって解決しましたか?
              {resolvedBy === "self" ? (
                <span className="text-red-500">(必須)</span>
              ) : (
                <span className="text-neutral-400">(任意)</span>
              )}
            </label>
            <textarea
              id="resolution_note"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              maxLength={1000}
              rows={3}
              placeholder="同じ困りごとを持つ人の参考になります。試したこと・効果があったことを書いてみてください。"
              className="w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm"
            />
          </div>
        )}
      </div>

      {error && <p className="mt-2 text-sm text-red-600">{error}</p>}

      <div className="mt-3 flex gap-2">
        <button
          type="button"
          onClick={submit}
          disabled={pending}
          className="rounded-lg bg-emerald-600 px-4 py-1.5 text-sm font-medium text-white hover:bg-emerald-700 disabled:opacity-60"
        >
          {pending ? "送信中…" : "報告する"}
        </button>
        <button
          type="button"
          onClick={() => setOpen(false)}
          className="rounded-lg px-3 py-1.5 text-sm text-neutral-500"
        >
          やめる
        </button>
      </div>
    </div>
  );
}
