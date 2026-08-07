import { z } from "zod";

/** 問い合わせ種別。開示・削除請求の受付経路を明示するため選択式にする。 */
export const CONTACT_CATEGORIES = [
  { value: "general", label: "サービスについての質問・ご意見" },
  { value: "disclosure", label: "個人情報の開示・訂正のご請求" },
  { value: "deletion", label: "投稿・アカウントの削除のご依頼" },
  { value: "infringement", label: "権利侵害・不適切な投稿の申告" },
  { value: "ad", label: "掲載・提携に関するご相談" },
  { value: "other", label: "その他" },
] as const;

export type ContactCategory = (typeof CONTACT_CATEGORIES)[number]["value"];

const CATEGORY_VALUES = CONTACT_CATEGORIES.map((c) => c.value) as [
  ContactCategory,
  ...ContactCategory[],
];

export const contactInputSchema = z.object({
  name: z.preprocess(
    (v) => (v === "" || v == null ? null : v),
    z.string().trim().max(60, "お名前は60字以内で入力してください").nullable()
  ),
  email: z
    .string()
    .trim()
    .min(1, "返信先のメールアドレスを入力してください")
    .max(200, "メールアドレスが長すぎます")
    .email("メールアドレスの形式が正しくありません"),
  category: z.enum(CATEGORY_VALUES, {
    errorMap: () => ({ message: "お問い合わせの種類を選択してください" }),
  }),
  message: z
    .string()
    .trim()
    .min(1, "お問い合わせ内容を入力してください")
    .max(2000, "お問い合わせ内容は2000字以内で入力してください"),
});

export type ContactInput = z.infer<typeof contactInputSchema>;

export function categoryLabel(value: string): string {
  return CONTACT_CATEGORIES.find((c) => c.value === value)?.label ?? value;
}
