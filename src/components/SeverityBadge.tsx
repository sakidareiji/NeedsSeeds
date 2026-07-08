import { SEVERITY_LABELS } from "@/lib/format";

/** 困り度(1〜5)に応じて色が濃くなるチップ。ラベル+色で一目で伝える。 */
const STYLES: Record<number, string> = {
  1: "bg-neutral-100 text-neutral-600",
  2: "bg-amber-50 text-amber-700",
  3: "bg-amber-100 text-amber-800",
  4: "bg-orange-100 text-orange-800",
  5: "bg-red-100 text-red-700",
};

export function SeverityBadge({ severity }: { severity: number }) {
  const s = Math.min(5, Math.max(1, severity));
  return (
    <span
      className={`whitespace-nowrap rounded-full px-2 py-0.5 text-xs font-medium ${STYLES[s]}`}
      title={`困り度 ${s}/5`}
    >
      {SEVERITY_LABELS[s]}
    </span>
  );
}
