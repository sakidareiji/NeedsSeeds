import { readFileSync } from "node:fs";
import { join } from "node:path";
import { z } from "zod";
import Anthropic from "@anthropic-ai/sdk";
import { resolveProvider } from "@/lib/analysis/llm";

/**
 * 投稿前チェック(下書きへの改善アドバイス)。F3 の本解析とは別の軽量な
 * 1回呼び出しで、「助言が必要か」と短い助言文だけを返す。
 * 失敗時は呼び出し側でフェイルオープン(アドバイスなし扱い)にすること。
 */
export type PrecheckResult = { advice: string | null };

export type PrecheckInput = {
  title: string;
  body: string;
  /** フォームで入力済みの値。渡すことで「既に答えている項目」を重ねて尋ねない。 */
  severity?: number | null;
  frequency?: string | null;
};

const precheckOutputSchema = z.object({
  needs_advice: z.boolean(),
  advice: z
    .string()
    .transform((s) => s.slice(0, 300))
    .nullable()
    .default(null),
});

let cachedPrompt: string | null = null;
function precheckPrompt(): string {
  if (cachedPrompt == null) {
    cachedPrompt = readFileSync(
      join(process.cwd(), "prompts", "precheck.md"),
      "utf8"
    );
  }
  return cachedPrompt;
}

const FREQUENCY_JA: Record<string, string> = {
  daily: "毎日",
  weekly: "週数回",
  monthly: "月数回",
  rarely: "たまに",
};

function buildDraftContent(input: PrecheckInput): string {
  return [
    "# 投稿の下書き",
    `タイトル: ${input.title}`,
    `困る度合い(フォーム入力): ${input.severity ? `${input.severity}/5` : "(未入力)"}`,
    `頻度(フォーム入力): ${input.frequency ? (FREQUENCY_JA[input.frequency] ?? input.frequency) : "(未入力)"}`,
    "本文:",
    input.body,
  ].join("\n");
}

const TIMEOUT_MS = 10_000; // 投稿を待たせすぎない。超過時は呼び出し側で素通し

async function precheckWithGemini(input: PrecheckInput): Promise<PrecheckResult> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new Error("GEMINI_API_KEY is not set");
  const model = process.env.GEMINI_MODEL || "gemini-2.5-flash";

  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-goog-api-key": apiKey },
      signal: AbortSignal.timeout(TIMEOUT_MS),
      body: JSON.stringify({
        system_instruction: { parts: [{ text: precheckPrompt() }] },
        contents: [
          { role: "user", parts: [{ text: buildDraftContent(input) }] },
        ],
        generationConfig: {
          responseMimeType: "application/json",
          responseSchema: {
            type: "OBJECT",
            properties: {
              needs_advice: { type: "BOOLEAN" },
              advice: {
                type: "STRING",
                nullable: true,
                description: "改善の助言(120字以内)。不要なら null",
              },
            },
            required: ["needs_advice"],
          },
          maxOutputTokens: 512,
          thinkingConfig: { thinkingBudget: 0 },
        },
      }),
    }
  );
  if (!res.ok) throw new Error(`Gemini precheck error ${res.status}`);
  const data = (await res.json()) as {
    candidates?: { content?: { parts?: { text?: string }[] } }[];
  };
  const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!text) throw new Error("no text part in Gemini precheck response");
  const parsed = precheckOutputSchema.parse(JSON.parse(text));
  return { advice: parsed.needs_advice ? parsed.advice : null };
}

async function precheckWithAnthropic(input: PrecheckInput): Promise<PrecheckResult> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) throw new Error("ANTHROPIC_API_KEY is not set");
  const model = process.env.ANTHROPIC_MODEL || "claude-sonnet-4-6";

  const client = new Anthropic({ apiKey, timeout: TIMEOUT_MS });
  const message = await client.messages.create({
    model,
    max_tokens: 512,
    thinking: { type: "disabled" },
    system: precheckPrompt(),
    tools: [
      {
        name: "submit_precheck",
        description: "下書きチェックの結果を提出する",
        input_schema: {
          type: "object" as const,
          properties: {
            needs_advice: { type: "boolean" },
            advice: {
              type: "string",
              description: "改善の助言(120字以内)。不要なら省略",
            },
          },
          required: ["needs_advice"],
        },
      },
    ],
    tool_choice: { type: "tool", name: "submit_precheck" },
    messages: [{ role: "user", content: buildDraftContent(input) }],
  });
  const toolUse = message.content.find((b) => b.type === "tool_use");
  if (!toolUse || toolUse.type !== "tool_use") {
    throw new Error("no tool_use block in precheck response");
  }
  const parsed = precheckOutputSchema.parse(toolUse.input);
  return { advice: parsed.needs_advice ? parsed.advice : null };
}

/** 下書きをチェックし、必要な場合のみ助言を返す(リトライなし・1回だけ)。 */
export async function precheckDraft(input: PrecheckInput): Promise<PrecheckResult> {
  return resolveProvider() === "gemini"
    ? precheckWithGemini(input)
    : precheckWithAnthropic(input);
}
