import { createAdminClient } from "@/lib/supabase/admin";
import { SeedAccountForm, SeedImportForm } from "@/components/admin/SeedForms";

export const dynamic = "force-dynamic";

export default async function AdminImportPage() {
  const admin = createAdminClient();
  const { data } = await admin
    .from("users")
    .select("id, display_name")
    .in("role", ["seed", "admin"])
    .order("created_at", { ascending: true });
  const seedAccounts = data ?? [];

  return (
    <div className="space-y-8">
      <section>
        <h2 className="mb-1 text-lg font-bold">シードアカウント</h2>
        <p className="mb-3 text-xs text-neutral-500">
          種投稿の割り当て先(role=seed)。コールドスタート対策用(F10)。
        </p>
        <SeedAccountForm />
      </section>

      <section>
        <h2 className="mb-1 text-lg font-bold">種投稿の一括インポート</h2>
        <p className="mb-3 text-xs text-neutral-500">
          CSV / JSON で投稿を一括投入します。取り込み後は各投稿に AI 解析が走ります。
        </p>
        {seedAccounts.length === 0 ? (
          <p className="text-sm text-amber-600">
            先にシードアカウントを作成してください。
          </p>
        ) : (
          <SeedImportForm seedAccounts={seedAccounts} />
        )}
      </section>
    </div>
  );
}
