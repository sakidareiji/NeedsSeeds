import Link from "next/link";
import type { Category } from "@/lib/categories";

export function CategoryTabs({
  categories,
  activeSlug,
}: {
  categories: Category[];
  activeSlug?: string;
}) {
  const base =
    "whitespace-nowrap rounded-full px-3 py-1.5 text-sm transition border";
  const active = "border-brand-500 bg-brand-500 text-white";
  const inactive =
    "border-neutral-200 bg-white text-neutral-600 hover:border-brand-300";

  return (
    <nav className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1">
      <Link
        href="/"
        className={`${base} ${!activeSlug ? active : inactive}`}
      >
        すべて
      </Link>
      {categories.map((c) => (
        <Link
          key={c.id}
          href={`/c/${c.slug}`}
          className={`${base} ${activeSlug === c.slug ? active : inactive}`}
        >
          {c.name}
        </Link>
      ))}
    </nav>
  );
}
