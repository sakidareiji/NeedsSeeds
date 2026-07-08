import Link from "next/link";
import type { SortMode } from "@/lib/posts/queries";

/** 注目順 / 新着 切り替え(F11: デフォルトは注目順)。 */
export function SortTabs({
  basePath,
  sort,
}: {
  basePath: string;
  sort: SortMode;
}) {
  const item = (mode: SortMode, label: string) => {
    const href = mode === "featured" ? basePath : `${basePath}?sort=new`;
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
