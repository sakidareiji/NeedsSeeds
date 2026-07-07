import {
  analysisOutputSchema,
  type AnalysisOutput,
} from "@/lib/analysis/schema";
import {
  buildUserContent,
  systemPrompt,
  type AnalysisInput,
} from "@/lib/analysis/input";

const DEFAULT_MODEL = "gemini-2.5-flash";
const MAX_ATTEMPTS = 3; // 初回 + リトライ2回(F3)

/**
 * Gemini の structured output 用スキーマ(OpenAPI サブセット・型名は大文字)。
 * 出力コントラクトは schema.ts の analysisToolSchema と同一。受信後は必ず
 * 同じ zod スキーマ(analysisOutputSchema)で検証する。
 */
const geminiResponseSchema = {
  type: "OBJECT",
  properties: {
    category_valid: { type: "BOOLEAN" },
    suggested_category_slug: {
      type: "STRING",
      nullable: true,
      description: "より適切なカテゴリの slug。妥当なら null",
    },
    sub_tags: {
      type: "ARRAY",
      items: { type: "STRING" },
      description: "検索・分類用の短いタグ(最大5)",
    },
    commercial_type: {
      type: "STRING",
      description: "解決策タイプ(例: 会計ソフト)。該当なしは 'none'",
    },
    moderation: {
      type: "OBJECT",
      properties: {
        abuse: { type: "BOOLEAN" },
        pii: { type: "BOOLEAN" },
        sensitive: { type: "BOOLEAN" },
        spam: { type: "BOOLEAN" },
      },
      required: ["abuse", "pii", "sensitive", "spam"],
    },
    matched_solutions: {
      type: "ARRAY",
      description: "マスタから選んだ解決策(0〜3件)。id はマスタに存在するもの",
      items: {
        type: "OBJECT",
        properties: {
          id: { type: "STRING" },
          pitch: { type: "STRING", description: "なぜ役立つか1〜2文" },
        },
        required: ["id", "pitch"],
      },
    },
    general_advice: {
      type: "STRING",
      nullable: true,
      description: "マッチ0件かつ非センシティブ時のみの一般アドバイス(2〜3文)。他は null",
    },
    quality_score: {
      type: "INTEGER",
      description: "投稿の具体性・有用性 0〜100(内部指標・非表示)",
    },
    follow_up_question: {
      type: "STRING",
      nullable: true,
      description: "品質が低めの投稿への短い問いかけ。十分なら null",
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

/**
 * Gemini API での解析(F3)。anthropic.ts と同じ入出力コントラクト。
 * SDK を追加せず REST + fetch で呼ぶ(依存を増やさない方針)。
 */
export async function analyzePost(
  input: AnalysisInput
): Promise<{ output: AnalysisOutput; model: string }> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new Error("GEMINI_API_KEY is not set");

  const model = process.env.GEMINI_MODEL || DEFAULT_MODEL;
  const body = JSON.stringify({
    system_instruction: { parts: [{ text: systemPrompt() }] },
    contents: [{ role: "user", parts: [{ text: buildUserContent(input) }] }],
    generationConfig: {
      responseMimeType: "application/json",
      responseSchema: geminiResponseSchema,
      maxOutputTokens: 2048,
      // 分類・生成タスクなので思考は無効(コスト/レイテンシ)。
      // 注: gemini-2.5-pro は思考を無効化できないため、モデルを変える場合は要調整。
      thinkingConfig: { thinkingBudget: 0 },
    },
  });

  let lastError: unknown;
  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
    try {
      const res = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "x-goog-api-key": apiKey,
          },
          body,
        }
      );
      if (!res.ok) {
        throw new Error(
          `Gemini API error ${res.status}: ${(await res.text()).slice(0, 300)}`
        );
      }

      const data = (await res.json()) as {
        candidates?: { content?: { parts?: { text?: string }[] } }[];
      };
      const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
      if (!text) throw new Error("no text part in Gemini response");

      const parsed = analysisOutputSchema.safeParse(JSON.parse(text));
      if (!parsed.success) {
        throw new Error(`schema validation failed: ${parsed.error.message}`);
      }
      return { output: parsed.data, model };
    } catch (err) {
      lastError = err;
      // 一時的エラー/検証失敗はリトライ。最後の試行なら投げる。
      if (attempt === MAX_ATTEMPTS) break;
    }
  }
  throw lastError instanceof Error
    ? lastError
    : new Error("analyzePost (gemini) failed");
}
