import Link from "next/link";
import type { AuthorFilter, SortMode } from "@/lib/posts/queries";

/** 一覧の投稿者絞り込み(すべて / 企業 / 個人)。ソート状態は維持する。 */
export function AuthorFilterTabs({
  basePath,
  sort,
  from,
}: {
  basePath: string;
  sort: SortMode;
  from: AuthorFilter;
}) {
  const item = (f: AuthorFilter, label: string) => {
    const params = new URLSearchParams();
    if (sort === "new") params.set("sort", "new");
    if (f !== "all") params.set("from", f);
    const qs = params.toString();
    const href = qs ? `${basePath}?${qs}` : basePath;
    const activeCls =
      from === f ? "text-brand-700 font-semibold" : "text-neutral-500";
    return (
      <Link key={f} href={href} className={`hover:text-brand-600 ${activeCls}`}>
        {label}
      </Link>
    );
  };

  return (
    <div className="flex gap-3 text-sm">
      {item("all", "すべて")}
      {item("company", "企業")}
      {item("personal", "個人")}
    </div>
  );
}
