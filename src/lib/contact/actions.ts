"use server";

import { headers } from "next/headers";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { sendEmail } from "@/lib/email";
import { contactInputSchema, categoryLabel } from "@/lib/contact/schema";
import { rateLimits } from "@config/limits";

export type ContactState = { ok?: true; error?: string } | null;

/** 送信元IP(Vercel/リバースプロキシ経由)。取得できないときは null。 */
function clientIp(): string | null {
  const h = headers();
  const forwarded = h.get("x-forwarded-for");
  if (forwarded) return forwarded.split(",")[0]?.trim() || null;
  return h.get("x-real-ip");
}

/**
 * 未ログインでも送れる窓口なので、同一IPからの連投を抑える(§7 と同じ考え方)。
 * IP が取れない環境ではレートリミットを諦めて通す(窓口を塞ぐ方が害が大きい)。
 */
async function canSubmit(ip: string | null): Promise<boolean> {
  if (!ip) return true;
  const admin = createAdminClient();
  const { count } = await admin
    .from("contact_messages")
    .select("id", { count: "exact", head: true })
    .eq("ip", ip)
    .gte("created_at", new Date(Date.now() - 3600 * 1000).toISOString());
  return (count ?? 0) < rateLimits.contactsPerHour;
}

/**
 * 問い合わせの受付。保存を正とし、運営へのメール通知は副(SMTP 未設定・障害でも
 * 受付は成立させ、管理画面 /admin/contact から必ず読める)。
 */
export async function submitContact(
  _prev: ContactState,
  formData: FormData
): Promise<ContactState> {
  // ボット除け(人間には見えない項目。埋まっていたら黙って成功扱いにする)。
  if (String(formData.get("website") ?? "").trim()) return { ok: true };

  const parsed = contactInputSchema.safeParse({
    name: formData.get("name"),
    email: formData.get("email"),
    category: formData.get("category"),
    message: formData.get("message"),
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "入力に誤りがあります" };
  }

  const ip = clientIp();
  if (!(await canSubmit(ip))) {
    return {
      error:
        "短時間に多くの送信がありました。しばらく時間をおいてから再度お試しください。",
    };
  }

  // ログイン中なら本人を紐づけておく(開示・削除請求の本人確認の手掛かり)。
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const admin = createAdminClient();
  const { error } = await admin.from("contact_messages").insert({
    user_id: user?.id ?? null,
    name: parsed.data.name,
    email: parsed.data.email,
    category: parsed.data.category,
    message: parsed.data.message,
    ip,
  });
  if (error) {
    return { error: "送信に失敗しました。しばらくして再度お試しください。" };
  }

  const to = process.env.CONTACT_EMAIL;
  if (to) {
    await sendEmail({
      to,
      subject: `[Needs Seeds] お問い合わせ: ${categoryLabel(parsed.data.category)}`,
      text: [
        `種類: ${categoryLabel(parsed.data.category)}`,
        `お名前: ${parsed.data.name ?? "(未記入)"}`,
        `返信先: ${parsed.data.email}`,
        `ユーザーID: ${user?.id ?? "(未ログイン)"}`,
        "",
        parsed.data.message,
        "",
        "--",
        "管理画面: /admin/contact",
      ].join("\n"),
    });
  }

  return { ok: true };
}
