import Link from "next/link";
import type { SimilarSolvedPost } from "@/lib/posts/queries";
import { postHandle, RESOLVED_BY_LABELS } from "@/lib/format";

/**
 * 「同じ悩みを解決した人がいます」(F6)。解決のヒントに続けて、同じ悩みで
 * 実際に解決した人の投稿と、その解決方法の要約を添える。AIの一般論とは別に、
 * 実在の解決報告(一次情報)を回答に加えることで納得感を高める。
 */
export function SimilarSolvedPosts({ posts }: { posts: SimilarSolvedPost[] }) {
  if (posts.length === 0) return null;
  return (
    <section className="space-y-3">
      <h2 className="text-lg font-bold">同じ悩みを解決した人がいます</h2>
      <ul className="space-y-3">
        {posts.map((p) => (
          <li
            key={p.id}
            className="rounded-xl border border-emerald-200 bg-emerald-50/40 p-4"
          >
            <div className="mb-1 flex flex-wrap items-center gap-2">
              <Link
                href={`/posts/${postHandle(p.id, p.title)}`}
                className="font-semibold text-emerald-800 hover:underline"
              >
                {p.title}
              </Link>
              {p.resolvedBy && RESOLVED_BY_LABELS[p.resolvedBy] && (
                <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-xs text-emerald-700">
                  {RESOLVED_BY_LABELS[p.resolvedBy]}
                </span>
              )}
            </div>
            <p className="line-clamp-3 whitespace-pre-wrap text-sm text-emerald-900/80">
              {p.resolutionNote}
            </p>
          </li>
        ))}
      </ul>
    </section>
  );
}
