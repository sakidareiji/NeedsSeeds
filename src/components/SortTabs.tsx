import Link from "next/link";
import type { AuthorFilter, SortMode } from "@/lib/posts/queries";

/** 注目順 / 新着 切り替え(F11: デフォルトは注目順)。絞り込み状態は維持する。 */
export function SortTabs({
  basePath,
  sort,
  from = "all",
}: {
  basePath: string;
  sort: SortMode;
  from?: AuthorFilter;
}) {
  const item = (mode: SortMode, label: string) => {
    const params = new URLSearchParams();
    if (mode === "new") params.set("sort", "new");
    if (from !== "all") params.set("from", from);
    const qs = params.toString();
    const href = qs ? `${basePath}?${qs}` : basePath;
    const activeCls =
      sort === mode ? "text-brand-700 font-semibold" : "text-neutral-500";
    return (
      <Link href={href} className={`hover:text-brand-600 ${activeCls}`}>
        {label}
      </Link>
    );
  };

  return (
    <div className="flex gap-4 text-sm">
      {item("featured", "注目順")}
      {item("new", "新着")}
    </div>
  );
}
