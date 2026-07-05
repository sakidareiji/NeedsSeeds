import { describe, it, expect } from "vitest";
import { analysisOutputSchema } from "@/lib/analysis/schema";
import {
  applyModerationRules,
  decidePostSolutions,
} from "@/lib/analysis/pipeline";

function out(overrides: Record<string, unknown> = {}) {
  return analysisOutputSchema.parse({
    category_valid: true,
    sub_tags: [],
    commercial_type: "none",
    moderation: { abuse: false, pii: false, sensitive: false, spam: false },
    matched_solutions: [],
    quality_score: 50,
    ...overrides,
  });
}

const ids = new Set(["sol-1", "sol-2"]);

describe("applyModerationRules (F7)", () => {
  it("hides on abuse / pii / spam, but not on sensitive", () => {
    expect(applyModerationRules(out({ moderation: { abuse: true, pii: false, sensitive: false, spam: false } })).hide).toBe(true);
    expect(applyModerationRules(out({ moderation: { abuse: false, pii: true, sensitive: false, spam: false } })).hide).toBe(true);
    expect(applyModerationRules(out({ moderation: { abuse: false, pii: false, sensitive: false, spam: true } })).hide).toBe(true);
    const sensitive = applyModerationRules(out({ moderation: { abuse: false, pii: false, sensitive: true, spam: false } }));
    expect(sensitive.hide).toBe(false);
    expect(sensitive.isSensitive).toBe(true);
  });
});

describe("decidePostSolutions (F4 / F3-5 / F7)", () => {
  it("shows matched master solutions, filtering unknown ids", () => {
    const o = out({
      matched_solutions: [
        { id: "sol-1", pitch: "役立ちます" },
        { id: "unknown", pitch: "偽ID" },
      ],
    });
    const res = decidePostSolutions(o, applyModerationRules(o), ids);
    expect(res).toHaveLength(1);
    expect(res[0]).toMatchObject({ solution_id: "sol-1", source: "master" });
  });

  it("falls back to general advice when no master matches", () => {
    const o = out({ matched_solutions: [], general_advice: "一般的なヒントです。" });
    const res = decidePostSolutions(o, applyModerationRules(o), ids);
    expect(res).toEqual([
      { solution_id: null, source: "ai_generated", pitch_text: "一般的なヒントです。", rank: 0 },
    ]);
  });

  it("suppresses BOTH solutions and advice for sensitive posts", () => {
    const o = out({
      moderation: { abuse: false, pii: false, sensitive: true, spam: false },
      matched_solutions: [{ id: "sol-1", pitch: "役立ちます" }],
      general_advice: "出してはいけない一般アドバイス",
    });
    const res = decidePostSolutions(o, applyModerationRules(o), ids);
    expect(res).toEqual([]);
  });

  it("suppresses everything for hidden (NG) posts", () => {
    const o = out({
      moderation: { abuse: true, pii: false, sensitive: false, spam: false },
      general_advice: "出してはいけない",
    });
    const res = decidePostSolutions(o, applyModerationRules(o), ids);
    expect(res).toEqual([]);
  });
});
