import { gradeForScore } from "@config/grades";

/** 貢献グレードのバッジ(F6)。投稿者名の横やプロフィールに表示。 */
export function GradeBadge({
  score,
  className = "",
}: {
  score: number;
  className?: string;
}) {
  const grade = gradeForScore(score);
  return (
    <span
      className={`inline-flex items-center gap-0.5 rounded-full bg-emerald-50 px-1.5 py-0.5 text-[10px] font-medium text-emerald-700 ${className}`}
      title={`貢献グレード: ${grade.name}`}
    >
      <span aria-hidden>🌿</span>
      {grade.name}
    </span>
  );
}
