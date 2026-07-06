/**
 * レートリミット(非機能要件 §7)。運用で変わる前提の設定ファイル。
 */
export const rateLimits = {
  /** 1ユーザーあたりの投稿上限(直近24時間) */
  postsPerDay: 10,
  /** 1ユーザーあたりの「わかる」上限(直近24時間) */
  empathiesPerDay: 200,
} as const;
