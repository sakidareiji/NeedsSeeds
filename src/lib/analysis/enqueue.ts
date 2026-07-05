import { runAnalysis } from "@/lib/analysis/pipeline";

/**
 * 投稿保存後に AI 解析を非同期起動する(F3 / 非機能: 保存をブロックしない)。
 *
 * fire-and-forget。ローカル開発ではプロセスが常駐するため即時に走る。
 * 本番(Vercel)ではレスポンス後の実行が保証されないため、`ai_status='pending'`
 * を DB フラグ(=キュー)として Vercel Cron が /api/analyze で拾い直す構成にしている
 * (過剰なインフラを避けた「DBフラグ + Cron」の簡易キュー)。
 */
export function enqueueAnalysis(postId: string): void {
  void runAnalysis(postId).catch(() => {
    // runAnalysis 内で ai_status='failed' に落とすため、ここでは握りつぶす。
  });
}
