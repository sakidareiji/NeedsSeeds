/**
 * 注目順(featured)ソートの重み係数。運用中に調整する前提で外出し(F11)。
 *
 * score = recencyWeight * recency
 *       + empathyWeight * log10(1 + empathy_count)
 *       + qualityWeight * (quality_score / 100)
 *
 * recency は投稿からの経過時間を halfLifeHours で指数減衰させた 0〜1 の値。
 * quality_score は M2 の AI 査定で付与される。未査定(null)の投稿は
 * neutralQuality を仮の係数として扱い、査定後に本来の重みへ反映される。
 */
export const rankingConfig = {
  recencyWeight: 1.0,
  empathyWeight: 0.6,
  qualityWeight: 0.8,
  halfLifeHours: 48,
  /** quality_score 未査定投稿に暫定適用する 0〜1 の品質係数 */
  neutralQuality: 0.5,
} as const;

/** 経過時間(時間)から 0〜1 の新着性スコアを返す(半減期による指数減衰) */
export function recencyScore(createdAt: Date, now: Date = new Date()): number {
  const ageHours = (now.getTime() - createdAt.getTime()) / 36e5;
  return Math.pow(0.5, ageHours / rankingConfig.halfLifeHours);
}

/** 投稿の注目順スコアを算出する */
export function featuredScore(input: {
  createdAt: Date;
  empathyCount: number;
  qualityScore: number | null;
  now?: Date;
}): number {
  const { recencyWeight, empathyWeight, qualityWeight, neutralQuality } =
    rankingConfig;
  const quality =
    input.qualityScore == null ? neutralQuality : input.qualityScore / 100;
  return (
    recencyWeight * recencyScore(input.createdAt, input.now) +
    empathyWeight * Math.log10(1 + Math.max(0, input.empathyCount)) +
    qualityWeight * quality
  );
}
