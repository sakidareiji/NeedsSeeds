"use client";

import { useEffect, useState } from "react";

/**
 * 投稿完了の通知バナー(ホーム画面)。`/?posted=1` で遷移してきたときに表示し、
 * URLからクエリを取り除く(再読み込みで再表示しないため)。
 * クエリ除去は history API で行い、RSC の再取得を発生させない。
 */
export function PostedBanner({ show }: { show: boolean }) {
  const [visible, setVisible] = useState(show);

  useEffect(() => {
    if (!show) return;
    window.history.replaceState(null, "", "/");
  }, [show]);

  if (!visible) return null;

  return (
    <div className="flex items-center justify-between rounded-xl bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
      <span>投稿しました。AIが解決のヒントを探しています。</span>
      <button
        type="button"
        onClick={() => setVisible(false)}
        className="text-emerald-600 hover:text-emerald-800"
        aria-label="閉じる"
      >
        ×
      </button>
    </div>
  );
}
