import { createClient } from "@/lib/supabase/server";

export type Category = {
  id: number;
  slug: string;
  name: string;
  sort_order: number;
};

/** Active categories, ordered for display (§2, DB-managed). */
export async function getActiveCategories(): Promise<Category[]> {
  const supabase = createClient();
  const { data } = await supabase
    .from("categories")
    .select("id, slug, name, sort_order")
    .eq("is_active", true)
    .order("sort_order", { ascending: true });
  return data ?? [];
}
