import { z } from "zod";

export const FREQUENCIES = ["daily", "weekly", "monthly", "rarely"] as const;

/** F2 投稿の入力バリデーション。タイトル60字・本文2000字・困る度合い1〜5。 */
export const postInputSchema = z.object({
  title: z
    .string()
    .trim()
    .min(1, "タイトルを入力してください")
    .max(60, "タイトルは60字以内で入力してください"),
  body: z
    .string()
    .trim()
    .min(1, "本文を入力してください")
    .max(2000, "本文は2,000字以内で入力してください"),
  category_id: z.coerce.number().int().positive("カテゴリを選択してください"),
  severity: z.coerce
    .number()
    .int()
    .min(1, "困る度合いを選択してください")
    .max(5),
  frequency: z
    .union([z.enum(FREQUENCIES), z.literal(""), z.undefined()])
    .transform((v) => (v ? v : null))
    .nullable(),
});

export type PostInput = z.infer<typeof postInputSchema>;
