/**
 * リアクション関連の調整値(F5)。運用で変わる前提の設定ファイル。
 */
export const reactionsConfig = {
  /** 「わかる」がこの件数に到達したとき投稿者へ通知(連打防止・節目のみ F5)。 */
  empathyMilestones: [1, 5, 10, 25, 50, 100, 250, 500, 1000],
} as const;

/** 到達した count がちょうど節目かどうか。 */
export function isEmpathyMilestone(count: number): boolean {
  return (reactionsConfig.empathyMilestones as readonly number[]).includes(count);
}
