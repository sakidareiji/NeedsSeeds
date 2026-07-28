import type { Frequency } from "@/lib/database.types";

/** Build a URL-safe slug from a post title (SEO, F11). */
export function slugify(title: string): string {
  const s = title
    .trim()
    .toLowerCase()
    // keep unicode letters/numbers (incl. Japanese), collapse everything else to '-'
    .replace(/[^\p{L}\p{N}]+/gu, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);
  return s || "post";
}

/** Compose the canonical post URL handle: `<uuid>-<slug>` (§F11 URL design). */
export function postHandle(id: string, title: string): string {
  return `${id}-${slugify(title)}`;
}

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i;

/** Extract the post id (UUID) from a `<uuid>-<slug>` handle. Null if invalid. */
export function idFromHandle(handle: string): string | null {
  const uuid = handle.slice(0, 36);
  return UUID_RE.test(uuid) ? uuid : null;
}

export const FREQUENCY_LABELS: Record<Frequency, string> = {
  daily: "毎日",
  weekly: "週数回",
  monthly: "月数回",
  rarely: "たまに",
};

export const SEVERITY_LABELS: Record<number, string> = {
  1: "少し困る",
  2: "困る",
  3: "かなり困る",
  4: "とても困る",
  5: "非常に困る",
};

/** 解決報告の手段ラベル(F6)。 */
export const RESOLVED_BY_LABELS: Record<string, string> = {
  solution: "解決策で解決",
  self: "自力で解決",
  other: "その他の方法で解決",
};

/** Relative Japanese time label, e.g. 「3時間前」. */
export function timeAgo(iso: string, now: Date = new Date()): string {
  const diff = now.getTime() - new Date(iso).getTime();
  const min = Math.floor(diff / 60000);
  if (min < 1) return "たった今";
  if (min < 60) return `${min}分前`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr}時間前`;
  const day = Math.floor(hr / 24);
  if (day < 30) return `${day}日前`;
  const mo = Math.floor(day / 30);
  if (mo < 12) return `${mo}ヶ月前`;
  return `${Math.floor(mo / 12)}年前`;
}
