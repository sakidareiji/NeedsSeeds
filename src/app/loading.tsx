/** ページ遷移中のスケルトン(白画面を出さない)。 */
export default function Loading() {
  return (
    <div className="space-y-6" aria-label="読み込み中" role="status">
      <div className="h-8 w-64 animate-pulse rounded-lg bg-neutral-200/70" />
      <div className="grid gap-3 lg:grid-cols-2 2xl:grid-cols-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <div
            key={i}
            className="animate-pulse rounded-xl border border-neutral-200 bg-white p-4"
          >
            <div className="mb-3 h-4 w-24 rounded bg-neutral-200/70" />
            <div className="mb-2 h-5 w-3/4 rounded bg-neutral-200/70" />
            <div className="mb-1 h-4 w-full rounded bg-neutral-100" />
            <div className="h-4 w-2/3 rounded bg-neutral-100" />
          </div>
        ))}
      </div>
    </div>
  );
}
