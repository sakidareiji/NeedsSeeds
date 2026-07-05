/**
 * 運営AIからの追記促し(F3-7)。責めないトーンで、投稿者に追記を促す。
 * 投稿者は本文の編集(追記)で応答でき、編集で再査定が走る。
 */
export function FollowUpComment({
  question,
  canEdit,
  editHref,
}: {
  question: string;
  canEdit: boolean;
  editHref: string;
}) {
  return (
    <aside className="rounded-xl border border-brand-200 bg-brand-50/60 p-4">
      <div className="mb-1 flex items-center gap-2 text-xs font-medium text-brand-700">
        <span aria-hidden>🌱</span>
        運営AIから
      </div>
      <p className="text-sm text-neutral-700">{question}</p>
      {canEdit && (
        <a
          href={editHref}
          className="mt-2 inline-block text-xs font-medium text-brand-700 hover:underline"
        >
          投稿を編集して追記する
        </a>
      )}
    </aside>
  );
}
