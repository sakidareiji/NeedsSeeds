/**
 * 貢献スコア帯 → グレード(F6)。名称・閾値は運用で変わる前提の設定ファイル。
 * 名称は仮(芽 → 双葉 → 若木 → 大樹)。昇順(min 昇順)で定義すること。
 */
export type Grade = {
  key: string;
  name: string;
  min: number; // このスコア以上でこのグレード
};

export const grades: Grade[] = [
  { key: "sprout", name: "芽", min: 0 },
  { key: "leaf", name: "双葉", min: 50 },
  { key: "sapling", name: "若木", min: 200 },
  { key: "tree", name: "大樹", min: 500 },
];

/** スコアから現在グレードを返す(閾値以下は最下位グレード)。 */
export function gradeForScore(score: number): Grade {
  let current = grades[0];
  for (const g of grades) {
    if (score >= g.min) current = g;
  }
  return current;
}

/** 次グレードまでの情報(最上位なら null)。プロフィール表示用。 */
export function nextGrade(score: number): { grade: Grade; remaining: number } | null {
  const next = grades.find((g) => g.min > score);
  return next ? { grade: next, remaining: next.min - score } : null;
}

/**
 * スコアが before → after に増えたとき、グレードが上がったかを返す(通知用)。
 */
export function gradeCrossed(before: number, after: number): Grade | null {
  const g1 = gradeForScore(before);
  const g2 = gradeForScore(after);
  return g1.key !== g2.key ? g2 : null;
}
