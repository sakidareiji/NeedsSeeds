import type { SolutionHint } from "@/lib/solutions";

/**
 * PR表記(F4 / 景表法ステマ規制対応)。アフィリエイト案件に必ず付す。
 * is_affiliate=true のとき非表示にできない実装とする(呼び出し側に隠すpropは無い)。
 */
function PrBadge() {
  return (
    <span
      className="rounded bg-neutral-200 px-1.5 py-0.5 text-[10px] font-semibold text-neutral-600"
      aria-label="PR(広告)"
    >
      PR
    </span>
  );
}

/** 一般アドバイスに必ず添える注記(F4)。source=ai_generated のとき強制表示。 */
function AdviceDisclaimer() {
  return (
    <p className="mt-2 text-xs text-neutral-400">
      AIによる一般的な情報であり、専門的な助言ではありません。
    </p>
  );
}

/** マスタ解決策1件(F4)。アフィリエイトなら PR を必ず表示。 */
export function MasterHint({ hint }: { hint: SolutionHint }) {
  const solution = hint.solution;
  if (!solution) return null;
  return (
    <li className="rounded-xl border border-neutral-200 bg-white p-4">
      <div className="mb-1 flex items-center gap-2">
        <a
          href={`/go/${hint.id}`}
          target="_blank"
          rel={solution.isAffiliate ? "nofollow sponsored noopener" : "noopener"}
          className="font-semibold text-brand-700 hover:underline"
        >
          {solution.name}
        </a>
        {/* is_affiliate が true の限り、この PR 表記は必ず出る(隠せない) */}
        {solution.isAffiliate && <PrBadge />}
      </div>
      <p className="text-sm text-neutral-700">{hint.pitchText}</p>
    </li>
  );
}

/** 一般アドバイス1件(F3-5 / F4)。専門的助言でない旨の注記を必ず添える。 */
export function AdviceHint({ hint }: { hint: SolutionHint }) {
  return (
    <li className="rounded-xl border border-neutral-200 bg-white p-4">
      <p className="text-sm text-neutral-700">{hint.pitchText}</p>
      <AdviceDisclaimer />
    </li>
  );
}

/** 「解決のヒント」セクション(F4)。マスタ提示と一般アドバイスを同一UIで混在。 */
export function SolutionHints({ hints }: { hints: SolutionHint[] }) {
  if (hints.length === 0) return null;
  return (
    <section className="space-y-3">
      <h2 className="text-lg font-bold">解決のヒント</h2>
      <ul className="space-y-3">
        {hints.map((hint) =>
          hint.source === "master" ? (
            <MasterHint key={hint.id} hint={hint} />
          ) : (
            <AdviceHint key={hint.id} hint={hint} />
          )
        )}
      </ul>
    </section>
  );
}
