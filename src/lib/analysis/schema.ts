import { z } from "zod";

/**
 * F3 の解析出力コントラクト。LLM は forced tool call でこの形を返す。
 * 受信後は必ず zod で検証し、失敗時はリトライ(最大2回)する。
 */
export const analysisOutputSchema = z.object({
  category_valid: z.boolean(),
  suggested_category_slug: z.string().nullable().default(null),
  sub_tags: z
    .array(z.string().min(1).transform((s) => s.slice(0, 30)))
    .default([])
    // 上限超過はエラーにせず最大5個に切り詰める(無駄なリトライを避ける)
    .transform((tags) => tags.slice(0, 5)),
  commercial_type: z.string().default("none"),
  moderation: z.object({
    abuse: z.boolean().default(false),
    pii: z.boolean().default(false),
    sensitive: z.boolean().default(false),
    spam: z.boolean().default(false),
  }),
  matched_solutions: z
    .array(
      z.object({
        id: z.string().min(1),
        // 長すぎる pitch はエラーにせず切り詰める(1文字超過でのリトライを避ける)
        pitch: z
          .string()
          .min(1)
          .transform((s) => s.slice(0, 400)),
      })
    )
    .default([])
    // 上限超過はエラーにせず最大3件に切り詰める
    .transform((m) => m.slice(0, 3)),
  general_advice: z
    .string()
    .transform((s) => s.slice(0, 600))
    .nullable()
    .default(null),
  quality_score: z
    .number()
    .transform((n) => Math.max(0, Math.min(100, Math.round(n)))),
  follow_up_question: z
    .string()
    .transform((s) => s.slice(0, 200))
    .nullable()
    .default(null),
});

export type AnalysisOutput = z.infer<typeof analysisOutputSchema>;

/**
 * Anthropic の forced tool 用 JSON Schema(strict は Sonnet 4.6 では非対応のため、
 * tool_choice で本ツールを強制し、返り値を上記 zod で検証する)。
 */
export const analysisToolSchema = {
  type: "object" as const,
  properties: {
    category_valid: { type: "boolean" },
    suggested_category_slug: {
      type: "string",
      description: "より適切なカテゴリの slug。妥当なら省略",
    },
    sub_tags: {
      type: "array",
      items: { type: "string" },
      description: "検索・分類用の短いタグ(最大5)",
    },
    commercial_type: {
      type: "string",
      description: "解決策タイプ(例: 会計ソフト)。該当なしは 'none'",
    },
    moderation: {
      type: "object",
      properties: {
        abuse: { type: "boolean" },
        pii: { type: "boolean" },
        sensitive: { type: "boolean" },
        spam: { type: "boolean" },
      },
      required: ["abuse", "pii", "sensitive", "spam"],
    },
    matched_solutions: {
      type: "array",
      description: "マスタから選んだ解決策(0〜3件)。id はマスタに存在するもの",
      items: {
        type: "object",
        properties: {
          id: { type: "string" },
          pitch: { type: "string", description: "なぜ役立つか1〜2文" },
        },
        required: ["id", "pitch"],
      },
    },
    general_advice: {
      type: "string",
      description: "マッチ0件かつ非センシティブ時のみの一般アドバイス(2〜3文)。他は省略",
    },
    quality_score: {
      type: "integer",
      description: "投稿の具体性・有用性 0〜100(内部指標・非表示)",
    },
    follow_up_question: {
      type: "string",
      description: "品質が低めの投稿への短い問いかけ。十分なら省略",
    },
  },
  required: [
    "category_valid",
    "sub_tags",
    "commercial_type",
    "moderation",
    "matched_solutions",
    "quality_score",
  ],
} as const;
