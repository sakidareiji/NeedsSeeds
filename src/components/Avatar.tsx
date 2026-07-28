/**
 * イニシャルのアバター(画像アップロードなしで一覧に個性を出す)。
 * 色はユーザーIDから決定的に選ぶ(同じ人はいつも同じ色)。
 */
const PALETTE = [
  "bg-brand-100 text-brand-800",
  "bg-emerald-100 text-emerald-800",
  "bg-sky-100 text-sky-800",
  "bg-amber-100 text-amber-800",
  "bg-rose-100 text-rose-800",
  "bg-violet-100 text-violet-800",
];

const SIZES = {
  sm: "h-6 w-6 text-xs",
  md: "h-8 w-8 text-sm",
  lg: "h-14 w-14 text-xl",
} as const;

export function Avatar({
  name,
  userId,
  size = "sm",
}: {
  name: string;
  /** null(退会したユーザー等)はニュートラル色になる。 */
  userId?: string | null;
  size?: keyof typeof SIZES;
}) {
  let hash = 0;
  for (const c of userId ?? "") hash = (hash * 31 + c.charCodeAt(0)) >>> 0;
  const color = userId
    ? PALETTE[hash % PALETTE.length]
    : "bg-neutral-100 text-neutral-400";
  const initial = Array.from(name.trim())[0] ?? "?";

  return (
    <span
      aria-hidden
      className={`flex shrink-0 select-none items-center justify-center rounded-full font-bold ${color} ${SIZES[size]}`}
    >
      {initial}
    </span>
  );
}
