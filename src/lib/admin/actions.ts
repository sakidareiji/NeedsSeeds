"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createAdminClient } from "@/lib/supabase/admin";
import { assertAdmin } from "@/lib/admin/guard";
import { runAnalysis } from "@/lib/analysis/pipeline";
import { parseSeedRows } from "@/lib/admin/import";
import type { PostStatus, ReportStatus, Frequency } from "@/lib/database.types";

export type AdminResult = { ok: boolean; message?: string };

// ---- 投稿の公開状態変更(F7/F10) ------------------------------------------
// 以下は <form action={...}> で直接使うため戻り値なし(void)。
export async function setPostStatus(
  postId: string,
  status: PostStatus
): Promise<void> {
  await assertAdmin();
  const admin = createAdminClient();
  await admin.from("posts").update({ status }).eq("id", postId);
  revalidatePath("/admin/posts");
  revalidatePath("/admin/top");
  revalidatePath("/");
}

// ---- 解析の再実行(解析失敗キュー F10) ------------------------------------
export async function retryAnalysis(postId: string): Promise<void> {
  await assertAdmin();
  await runAnalysis(postId);
  revalidatePath("/admin/analysis");
}

// ---- 通報の処理(通報キュー F10) ------------------------------------------
export async function setReportStatus(
  reportId: string,
  status: ReportStatus
): Promise<void> {
  await assertAdmin();
  const admin = createAdminClient();
  await admin.from("reports").update({ status }).eq("id", reportId);
  revalidatePath("/admin/reports");
}

/** 問い合わせの対応状況を切り替える(/admin/contact)。 */
export async function setContactStatus(
  messageId: string,
  status: "open" | "closed"
): Promise<void> {
  await assertAdmin();
  const admin = createAdminClient();
  await admin.from("contact_messages").update({ status }).eq("id", messageId);
  revalidatePath("/admin/contact");
}

// ---- カテゴリ CRUD(F10) --------------------------------------------------
export async function upsertCategory(formData: FormData): Promise<void> {
  await assertAdmin();
  const admin = createAdminClient();
  const id = formData.get("id");
  const row = {
    slug: String(formData.get("slug") ?? "").trim(),
    name: String(formData.get("name") ?? "").trim(),
    sort_order: Number(formData.get("sort_order") ?? 0),
    is_active: formData.get("is_active") === "on",
  };
  if (!row.slug || !row.name) return; // 必須欠落は no-op(入力側で required)

  if (id) {
    await admin.from("categories").update(row).eq("id", Number(id));
  } else {
    await admin.from("categories").insert(row);
  }
  revalidatePath("/admin/categories");
  revalidatePath("/");
}

// ---- 解決策マスタ CRUD(F4/F10) ------------------------------------------
export async function upsertSolution(formData: FormData): Promise<void> {
  await assertAdmin();
  const admin = createAdminClient();
  const id = formData.get("id");
  const commercialTypes = String(formData.get("commercial_types") ?? "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
  const categoryIds = String(formData.get("category_ids") ?? "")
    .split(",")
    .map((s) => Number(s.trim()))
    .filter((n) => Number.isInteger(n) && n > 0);

  const row = {
    name: String(formData.get("name") ?? "").trim(),
    description: String(formData.get("description") ?? "").trim(),
    url: String(formData.get("url") ?? "").trim(),
    is_affiliate: formData.get("is_affiliate") === "on",
    commercial_types: commercialTypes,
    category_ids: categoryIds,
    status: (formData.get("status") === "paused" ? "paused" : "active") as
      | "active"
      | "paused",
  };
  if (!row.name || !row.url) return; // 必須欠落は no-op(入力側で required)

  if (id) {
    await admin.from("solutions").update(row).eq("id", String(id));
  } else {
    await admin.from("solutions").insert(row);
  }
  revalidatePath("/admin/solutions");
}

// ---- シードアカウント作成(F10 種投稿の割り当て先) ------------------------
// useFormState 互換のため (prev, formData) 署名。
export async function createSeedAccount(
  _prev: AdminResult | null,
  formData: FormData
): Promise<AdminResult> {
  await assertAdmin();
  const admin = createAdminClient();
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  const displayName = String(formData.get("display_name") ?? "").trim();
  if (!email || !password || !displayName) {
    return { ok: false, message: "メール・パスワード・表示名は必須です" };
  }

  const { data, error } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { display_name: displayName },
  });
  if (error || !data.user) {
    return { ok: false, message: error?.message ?? "作成に失敗しました" };
  }
  // トリガで作られた public.users の role を seed に更新。
  await admin.from("users").update({ role: "seed" }).eq("id", data.user.id);
  revalidatePath("/admin/import");
  return { ok: true, message: `シードアカウント ${displayName} を作成しました` };
}

// ---- 種投稿の一括インポート(F10 CSV/JSON) --------------------------------
// useFormState 互換のため (prev, formData) 署名。
export async function importSeedPosts(
  _prev: AdminResult | null,
  formData: FormData
): Promise<AdminResult> {
  await assertAdmin();
  const admin = createAdminClient();

  const authorId = String(formData.get("author_id") ?? "");
  const format = formData.get("format") === "json" ? "json" : "csv";
  const text = String(formData.get("data") ?? "");
  if (!authorId) return { ok: false, message: "割り当てるシードアカウントを選んでください" };
  if (!text.trim()) return { ok: false, message: "データが空です" };

  const { rows, errors } = parseSeedRows(text, format);
  if (rows.length === 0) {
    return { ok: false, message: `取り込める行がありません。${errors.slice(0, 3).join(" / ")}` };
  }

  // カテゴリ slug → id 解決。
  const { data: cats } = await admin.from("categories").select("id, slug");
  const bySlug = new Map((cats ?? []).map((c) => [c.slug, c.id]));

  const toInsert: {
    user_id: string;
    category_id: number;
    title: string;
    body: string;
    severity: number;
    frequency: Frequency | null;
  }[] = [];
  const skipped: string[] = [];
  rows.forEach((r, i) => {
    const categoryId = bySlug.get(r.category);
    if (!categoryId) {
      skipped.push(`${i + 1}行目: 未知のカテゴリ '${r.category}'`);
      return;
    }
    toInsert.push({
      user_id: authorId,
      category_id: categoryId,
      title: r.title,
      body: r.body,
      severity: r.severity,
      frequency: r.frequency,
    });
  });

  if (toInsert.length === 0) {
    return { ok: false, message: `取り込める行がありません。${skipped.slice(0, 3).join(" / ")}` };
  }

  const { data: inserted, error } = await admin
    .from("posts")
    .insert(toInsert)
    .select("id");
  if (error) return { ok: false, message: error.message };

  // AI 解析はここでは実行しない。50件 × 数秒の逐次 LLM 呼び出しは server action
  // のタイムアウトを超えるため、ai_status='pending' のまま Cron(/api/analyze)に
  // 委ねる(このための簡易キュー)。

  revalidatePath("/admin/import");
  revalidatePath("/");
  const note = [
    `${inserted?.length ?? 0} 件を取り込みました`,
    errors.length ? `検証エラー ${errors.length} 件` : "",
    skipped.length ? `カテゴリ不明で除外 ${skipped.length} 件` : "",
  ]
    .filter(Boolean)
    .join(" / ");
  return { ok: true, message: note };
}

// ---- 運営からのお知らせ(F8) -----------------------------------------------
/** 全ユーザー(シードアカウント除く)へ type='admin' の通知を一括送信する。 */
export async function sendAnnouncement(formData: FormData): Promise<void> {
  await assertAdmin();

  const message = String(formData.get("message") ?? "").trim();
  if (!message || message.length > 500) {
    redirect("/admin/announcements?error=1");
  }

  const admin = createAdminClient();
  const { data: users } = await admin
    .from("users")
    .select("id")
    .neq("role", "seed");

  const recipients = users ?? [];
  if (recipients.length > 0) {
    await admin.from("notifications").insert(
      recipients.map((u) => ({
        user_id: u.id,
        type: "admin",
        payload: { message },
      }))
    );
  }

  redirect(`/admin/announcements?sent=${recipients.length}`);
}
