import { z } from "zod";

export const GENDERS = ["male", "female", "other", "unspecified"] as const;

/** 空文字/未指定は null として扱う(年齢未入力を 0 にしないための前処理)。 */
function emptyToNull(v: unknown): unknown {
  return v === "" || v == null ? null : v;
}

/** プロフィール編集の入力バリデーション。実名不要のため全項目任意(表示名を除く)。 */
export const profileInputSchema = z.object({
  display_name: z
    .string()
    .trim()
    .min(1, "表示名を入力してください")
    .max(40, "表示名は40字以内で入力してください"),
  bio: z.preprocess(
    emptyToNull,
    z
      .string()
      .trim()
      .max(500, "自己紹介は500字以内で入力してください")
      .nullable()
  ),
  gender: z.preprocess(emptyToNull, z.enum(GENDERS).nullable()),
  age: z.preprocess(
    emptyToNull,
    z.union([
      z.null(),
      z.coerce
        .number({ invalid_type_error: "年齢は数値で入力してください" })
        .int()
        .min(0, "年齢は0以上で入力してください")
        .max(150, "年齢の値が不正です"),
    ])
  ),
});

export type ProfileInput = z.infer<typeof profileInputSchema>;
