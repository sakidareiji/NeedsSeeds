/**
 * 貢献スコアの加点ルール(F6)。運用中に調整する前提で外出し。
 * 貢献スコアは換金・交換不可の reputation。ここに閾値・減点は置かない
 * (スコアは減らない設計。モデレーション違反は投稿の非公開化で対応する)。
 */
export const scoringConfig = {
  /** AI品質査定(F3-6)の段階しきい値と付与点。quality_score 0〜100 を段階化。 */
  quality: {
    highMin: 70, // これ以上 = 高品質
    standardMin: 40, // これ以上 = 標準
    highPoints: 10,
    standardPoints: 3,
    lowPoints: 1,
  },
  /** 解決報告(F6): 投稿者が「解決した」と報告したときの基本加点。 */
  resolutionPoints: 2,
  /** 「わかる」を多く集めた投稿の解決報告への追加加点(F6)。 */
  highEmpathyResolution: {
    empathyMin: 10, // この件数以上の共感を集めていれば
    points: 5,
  },
  /** 他ユーザーの「私も解決した」1件ごとに投稿者へ付与(F6)。 */
  helpfulMarkPoints: 2,
} as const;

export type QualityBand = "high" | "standard" | "low";

/** quality_score(0〜100)を段階に落とす。 */
export function qualityBand(score: number): QualityBand {
  const { highMin, standardMin } = scoringConfig.quality;
  if (score >= highMin) return "high";
  if (score >= standardMin) return "standard";
  return "low";
}

/**
 * AI査定による貢献スコア(F3-6)。モデレーションフラグ(誹謗中傷・スパム・害悪)が
 * 立った投稿は 0。それ以外は品質段階に応じて付与する。
 */
export function assessmentPoints(input: {
  qualityScore: number;
  flaggedHarmful: boolean; // abuse / spam / pii のいずれか
}): number {
  if (input.flaggedHarmful) return 0;
  const { highPoints, standardPoints, lowPoints } = scoringConfig.quality;
  switch (qualityBand(input.qualityScore)) {
    case "high":
      return highPoints;
    case "standard":
      return standardPoints;
    default:
      return lowPoints;
  }
}

/** 解決報告の加点(基本 + 高共感ボーナス)。F6。 */
export function resolutionPoints(empathyCount: number): number {
  const base = scoringConfig.resolutionPoints;
  const { empathyMin, points } = scoringConfig.highEmpathyResolution;
  return base + (empathyCount >= empathyMin ? points : 0);
}
