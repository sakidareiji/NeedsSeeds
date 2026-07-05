import { describe, it, expect } from "vitest";
import { analysisOutputSchema } from "@/lib/analysis/schema";

const valid = {
  category_valid: true,
  sub_tags: ["請求書作成", "時間管理"],
  commercial_type: "会計ソフト",
  moderation: { abuse: false, pii: false, sensitive: false, spam: false },
  matched_solutions: [{ id: "sol-1", pitch: "自動で帳簿がつけられます。" }],
  quality_score: 72,
};

describe("analysisOutputSchema (F3 LLM出力バリデーション)", () => {
  it("accepts a well-formed payload and fills nullable defaults", () => {
    const r = analysisOutputSchema.safeParse(valid);
    expect(r.success).toBe(true);
    if (r.success) {
      expect(r.data.general_advice).toBeNull();
      expect(r.data.follow_up_question).toBeNull();
      expect(r.data.suggested_category_slug).toBeNull();
    }
  });

  it("clamps quality_score into 0..100 and rounds", () => {
    const r = analysisOutputSchema.parse({ ...valid, quality_score: 150.7 });
    expect(r.quality_score).toBe(100);
    const r2 = analysisOutputSchema.parse({ ...valid, quality_score: -5 });
    expect(r2.quality_score).toBe(0);
  });

  it("truncates sub_tags to 5 and matched_solutions to 3", () => {
    const r = analysisOutputSchema.parse({
      ...valid,
      sub_tags: ["a", "b", "c", "d", "e", "f", "g"],
      matched_solutions: [
        { id: "1", pitch: "p" },
        { id: "2", pitch: "p" },
        { id: "3", pitch: "p" },
        { id: "4", pitch: "p" },
      ],
    });
    expect(r.sub_tags).toHaveLength(5);
    expect(r.matched_solutions).toHaveLength(3);
  });

  it("rejects payloads missing required fields (→ triggers retry in pipeline)", () => {
    const { moderation, ...missingModeration } = valid;
    void moderation;
    expect(analysisOutputSchema.safeParse(missingModeration).success).toBe(false);
    expect(
      analysisOutputSchema.safeParse({ ...valid, quality_score: "high" }).success
    ).toBe(false);
  });
});
