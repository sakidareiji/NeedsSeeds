"use client";

import { useEffect, useState } from "react";

/**
 * 投稿完了の通知バナー(ホーム画面)。`/?posted=1` のときに親が描画する。
 * マウント時にURLからクエリを取り除く(再読み込みで再表示しないため)。
 * クエリ除去は history API で行い、RSC の再取得を発生させない
 * (Next.js 14.1+ は history.replaceState をルーター状態に同期する)。
 */
export function PostedBanner() {
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    window.history.replaceState(null, "", "/");
  }, []);

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
