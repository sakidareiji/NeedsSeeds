"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

const INTERVAL_MS = 5_000;
const MAX_POLLS = 24; // 約2分。以降は手動リロードに委ねる(Cronが拾い直す)

/**
 * AI解析待ちの表示(F3)。解析完了を自動で反映するため、表示中は
 * 定期的にサーバーコンポーネントを再取得する。ヒントが表示されると
 * この要素ごと消えるため、ポーリングも自然に止まる。
 */
export function AnalyzingHints() {
  const router = useRouter();

  useEffect(() => {
    let count = 0;
    const timer = setInterval(() => {
      count += 1;
      if (count > MAX_POLLS) {
        clearInterval(timer);
        return;
      }
      router.refresh();
    }, INTERVAL_MS);
    return () => clearInterval(timer);
  }, [router]);

  return (
    <div className="flex items-center gap-3 rounded-xl border border-dashed border-brand-200 bg-brand-50/40 p-4 text-sm text-brand-800/70">
      <span aria-hidden className="animate-bounce text-lg">
        🌱
      </span>
      <span>
        AIが解決のヒントを探しています…
        <span className="ml-1 text-xs text-brand-800/50">(見つかると自動で表示されます)</span>
      </span>
    </div>
  );
}
