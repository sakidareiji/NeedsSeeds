"use client";

import Link from "next/link";
import { useEffect, useLayoutEffect, useRef } from "react";
import type { Category } from "@/lib/categories";

// SSR では layout effect を実行できない(警告回避)。クライアントでは描画前に
// スクロール位置を確定させたいので useLayoutEffect を使う。
const useIsomorphicLayoutEffect =
  typeof window !== "undefined" ? useLayoutEffect : useEffect;

export function CategoryTabs({
  categories,
  activeSlug,
}: {
  categories: Category[];
  activeSlug?: string;
}) {
  const activeRef = useRef<HTMLAnchorElement>(null);

  // 選択中のカテゴリを横スクロールで中央に寄せる。再マウント時は scrollLeft が
  // 0(左端)から始まるため、描画前(layout effect)にアニメーションなしで
  // 確定させる。これで「一度左に戻ってから動く」挙動を防ぐ。
  // block:"nearest" で縦方向のスクロール(ページの飛び)は起こさない。
  useIsomorphicLayoutEffect(() => {
    activeRef.current?.scrollIntoView({ inline: "center", block: "nearest" });
  }, [activeSlug]);

  const base =
    "whitespace-nowrap rounded-full px-3 py-1.5 text-sm transition border";
  const active = "border-brand-500 bg-brand-500 text-white";
  const inactive =
    "border-neutral-200 bg-white text-neutral-600 hover:border-brand-300";

  return (
    <nav className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
      <Link
        href="/"
        ref={!activeSlug ? activeRef : null}
        className={`${base} ${!activeSlug ? active : inactive}`}
      >
        すべて
      </Link>
      {categories.map((c) => (
        <Link
          key={c.id}
          href={`/c/${c.slug}`}
          ref={activeSlug === c.slug ? activeRef : null}
          className={`${base} ${activeSlug === c.slug ? active : inactive}`}
        >
          {c.name}
        </Link>
      ))}
    </nav>
  );
}
