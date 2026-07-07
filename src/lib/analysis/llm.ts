import { analyzePost as analyzeWithAnthropic } from "@/lib/analysis/anthropic";
import { analyzePost as analyzeWithGemini } from "@/lib/analysis/gemini";
import type { AnalysisInput } from "@/lib/analysis/input";
import type { AnalysisOutput } from "@/lib/analysis/schema";

export type LlmProvider = "gemini" | "anthropic";

/**
 * LLM プロバイダの選択(F3)。`LLM_PROVIDER` で明示指定でき、未指定なら
 * 設定済みの API キーから自動選択する(両方あれば gemini を優先)。
 * どちらのプロバイダも同じ入出力コントラクト(zod 検証込み)を実装している。
 */
export function resolveProvider(): LlmProvider {
  const p = process.env.LLM_PROVIDER;
  if (p === "gemini" || p === "anthropic") return p;
  if (process.env.GEMINI_API_KEY) return "gemini";
  return "anthropic";
}

export async function analyzePost(
  input: AnalysisInput
): Promise<{ output: AnalysisOutput; model: string }> {
  return resolveProvider() === "gemini"
    ? analyzeWithGemini(input)
    : analyzeWithAnthropic(input);
}
