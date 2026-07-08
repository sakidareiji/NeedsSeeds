import Link from "next/link";

export default function NotFound() {
  return (
    <div className="mx-auto max-w-md py-20 text-center">
      <p aria-hidden className="text-4xl">
        🌱
      </p>
      <h1 className="mt-4 text-lg font-bold">ページが見つかりません</h1>
      <p className="mt-2 text-sm text-neutral-500">
        お探しのページは削除されたか、URLが変更された可能性があります。
      </p>
      <Link
        href="/"
        className="mt-6 inline-block rounded-full bg-brand-500 px-6 py-2 text-sm font-medium text-white hover:bg-brand-600"
      >
        ホームへ戻る
      </Link>
    </div>
  );
}
