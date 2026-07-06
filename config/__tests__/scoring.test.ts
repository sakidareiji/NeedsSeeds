import { describe, it, expect } from "vitest";
import {
  qualityBand,
  assessmentPoints,
  resolutionPoints,
  scoringConfig,
} from "@config/scoring";

describe("qualityBand / assessmentPoints (F3-6 貢献スコア付与)", () => {
  it("bands quality_score by configured thresholds", () => {
    expect(qualityBand(90)).toBe("high");
    expect(qualityBand(70)).toBe("high"); // 境界(highMin以上)
    expect(qualityBand(55)).toBe("standard");
    expect(qualityBand(40)).toBe("standard");
    expect(qualityBand(10)).toBe("low");
  });

  it("awards points per band (高+10 / 標準+3 / 低+1)", () => {
    expect(assessmentPoints({ qualityScore: 90, flaggedHarmful: false })).toBe(10);
    expect(assessmentPoints({ qualityScore: 50, flaggedHarmful: false })).toBe(3);
    expect(assessmentPoints({ qualityScore: 5, flaggedHarmful: false })).toBe(1);
  });

  it("gives 0 to moderation-flagged posts regardless of quality (F6)", () => {
    expect(assessmentPoints({ qualityScore: 95, flaggedHarmful: true })).toBe(0);
  });
});

describe("resolutionPoints (F6 解決報告加点 + 高共感ボーナス)", () => {
  it("adds the high-empathy bonus only above the empathy threshold", () => {
    const { empathyMin, points } = scoringConfig.highEmpathyResolution;
    const base = scoringConfig.resolutionPoints;
    expect(resolutionPoints(empathyMin - 1)).toBe(base);
    expect(resolutionPoints(empathyMin)).toBe(base + points);
    expect(resolutionPoints(empathyMin + 100)).toBe(base + points);
  });
});
