import { AppendForm } from "@/components/AppendForm";

/**
 * 運営AIからの追記促し(F3-7)。責めないトーンで、投稿者に追記を促す。
 * 応答は本文への「追記」で行う(既存本文は変更しない追加のみなので、
 * 「わかる」が付いて編集ロックされた投稿でも応答できる)。追記で再査定が走る。
 */
export function FollowUpComment({
  question,
  canRespond,
  postId,
}: {
  question: string;
  canRespond: boolean;
  postId: string;
}) {
  return (
    <aside className="rounded-xl border border-brand-200 bg-brand-50/60 p-4">
      <div className="mb-1 flex items-center gap-2 text-xs font-medium text-brand-700">
        <span aria-hidden>🌱</span>
        運営AIから
      </div>
      <p className="text-sm text-neutral-700">{question}</p>
      {canRespond && <AppendForm postId={postId} />}
    </aside>
  );
}
