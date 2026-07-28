"use client";

/** 予期しないエラーの境界。リロードで復帰できる導線を出す。 */
export default function Error({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="mx-auto max-w-md py-20 text-center">
      <p aria-hidden className="text-4xl">
        🥀
      </p>
      <h1 className="mt-4 text-lg font-bold">問題が発生しました</h1>
      <p className="mt-2 text-sm text-neutral-500">
        一時的なエラーの可能性があります。少し待ってからもう一度お試しください。
      </p>
      <button
        type="button"
        onClick={reset}
        className="mt-6 rounded-full bg-brand-500 px-6 py-2 text-sm font-medium text-white hover:bg-brand-600"
      >
        再読み込み
      </button>
    </div>
  );
}
