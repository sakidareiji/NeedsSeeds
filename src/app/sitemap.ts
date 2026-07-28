import type { MetadataRoute } from "next";
import { createClient } from "@/lib/supabase/server";
import { postHandle } from "@/lib/format";

export const dynamic = "force-dynamic";

const BASE = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";

/** sitemap.xml 自動生成(F11)。公開投稿・カテゴリ・静的ページを含める。 */
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const supabase = createClient();

  const [{ data: posts }, { data: cats }] = await Promise.all([
    supabase
      .from("posts")
      .select("id, title, updated_at")
      .eq("status", "published")
      .order("created_at", { ascending: false })
      .limit(5000),
    supabase.from("categories").select("slug").eq("is_active", true),
  ]);

  const staticPages: MetadataRoute.Sitemap = [
    { url: `${BASE}/`, changeFrequency: "hourly", priority: 1 },
    { url: `${BASE}/terms` },
    { url: `${BASE}/privacy` },
    { url: `${BASE}/about` },
    { url: `${BASE}/contact` },
  ];

  const categoryPages: MetadataRoute.Sitemap = (cats ?? []).map((c) => ({
    url: `${BASE}/c/${c.slug}`,
    changeFrequency: "daily",
    priority: 0.6,
  }));

  const postPages: MetadataRoute.Sitemap = (posts ?? []).map((p) => ({
    url: `${BASE}/posts/${postHandle(p.id, p.title)}`,
    lastModified: p.updated_at,
    changeFrequency: "weekly",
    priority: 0.7,
  }));

  return [...staticPages, ...categoryPages, ...postPages];
}
