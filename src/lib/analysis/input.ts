import { readFileSync } from "node:fs";
import { join } from "node:path";

/** F3 解析の入力。プロバイダ(anthropic/gemini)間で共通。 */
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
export function systemPrompt(): string {
  if (cachedPrompt == null) {
    // /prompts はコード変更なしで調整可能(F3)。next.config で bundle に含める。
    cachedPrompt = readFileSync(
      join(process.cwd(), "prompts", "analyze.md"),
      "utf8"
    );
  }
  return cachedPrompt;
}

export function buildUserContent(input: AnalysisInput): string {
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
