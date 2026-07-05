import { readFileSync } from "node:fs";
import { join } from "node:path";
import Anthropic from "@anthropic-ai/sdk";
import {
  analysisOutputSchema,
  analysisToolSchema,
  type AnalysisOutput,
} from "@/lib/analysis/schema";

const DEFAULT_MODEL = "claude-sonnet-4-6";
const MAX_ATTEMPTS = 3; // 初回 + リトライ2回(F3)

export type AnalysisInput = {
  title: string;
  body: string;
  severity: number;
  frequency: string | null;
  categoryName: string;
  categories: { slug: string; name: string }[];
  solutions: {
    id: string;
    name: string;
    description: string;
    commercial_types: string[];
  }[];
};

let cachedPrompt: string | null = null;
function systemPrompt(): string {
  if (cachedPrompt == null) {
    // /prompts はコード変更なしで調整可能(F3)。next.config で bundle に含める。
    cachedPrompt = readFileSync(
      join(process.cwd(), "prompts", "analyze.md"),
      "utf8"
    );
  }
  return cachedPrompt;
}

function buildUserContent(input: AnalysisInput): string {
  const cats = input.categories.map((c) => `- ${c.slug}: ${c.name}`).join("\n");
  const master =
    input.solutions.length === 0
      ? "(現在マッチ対象の解決策マスタはありません)"
      : input.solutions
          .map(
            (s) =>
              `- id: ${s.id}\n  名称: ${s.name}\n  説明: ${s.description}\n  タイプ: ${s.commercial_types.join(", ") || "(未設定)"}`
          )
          .join("\n");

  return [
    "# カテゴリ一覧",
    cats,
    "",
    "# 解決策マスタ",
    master,
    "",
    "# 投稿",
    `選択カテゴリ: ${input.categoryName}`,
    `困る度合い: ${input.severity}/5`,
    `頻度: ${input.frequency ?? "(未回答)"}`,
    `タイトル: ${input.title}`,
    "本文:",
    input.body,
  ].join("\n");
}

/**
 * 1投稿を1回のLLM呼び出しで解析する(F3 / 非機能: 1投稿1API呼び出し)。
 * forced tool call でJSONを得て zod 検証。検証/一時失敗時は最大2回リトライ。
 * @returns 検証済み出力と使用モデル
 */
export async function analyzePost(
  input: AnalysisInput
): Promise<{ output: AnalysisOutput; model: string }> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) throw new Error("ANTHROPIC_API_KEY is not set");

  const model = process.env.ANTHROPIC_MODEL || DEFAULT_MODEL;
  const client = new Anthropic({ apiKey });
  const user = buildUserContent(input);

  let lastError: unknown;
  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
    try {
      const message = await client.messages.create({
        model,
        max_tokens: 2048,
        // 分類・生成タスク。forced tool と両立させるため思考は無効(コスト面でも有利)。
        thinking: { type: "disabled" },
        system: systemPrompt(),
        tools: [
          {
            name: "submit_analysis",
            description: "投稿の解析結果を提出する",
            input_schema:
              analysisToolSchema as unknown as Anthropic.Tool["input_schema"],
          },
        ],
        tool_choice: { type: "tool", name: "submit_analysis" },
        messages: [{ role: "user", content: user }],
      });

      const toolUse = message.content.find((b) => b.type === "tool_use");
      if (!toolUse || toolUse.type !== "tool_use") {
        throw new Error("no tool_use block in response");
      }

      const parsed = analysisOutputSchema.safeParse(toolUse.input);
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
    : new Error("analyzePost failed");
}
