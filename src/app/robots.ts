import type { MetadataRoute } from "next";

const BASE = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";

/** robots.txt(F11)。運営・内部エンドポイント・個人ページはクロール除外。 */
export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: ["/admin", "/api", "/go", "/notifications", "/login", "/signup"],
    },
    sitemap: `${BASE}/sitemap.xml`,
  };
}
