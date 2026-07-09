import { createClient } from "@/lib/supabase/server";

export type Category = {
  id: number;
  slug: string;
  name: string;
  sort_order: number;
  /** カテゴリページの説明文(SEO)。見出し下と meta description に使う。 */
  description: string;
};

/** Active categories, ordered for display (§2, DB-managed). */
export async function getActiveCategories(): Promise<Category[]> {
  const supabase = createClient();
  const { data } = await supabase
    .from("categories")
    .select("id, slug, name, sort_order, description")
    .eq("is_active", true)
    .order("sort_order", { ascending: true });
  return data ?? [];
}
