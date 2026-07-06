import { describe, it, expect } from "vitest";
import { gradeForScore, nextGrade, gradeCrossed } from "@config/grades";
import { isEmpathyMilestone } from "@config/reactions";

describe("gradeForScore (F6 グレード)", () => {
  it("maps scores to grades at thresholds", () => {
    expect(gradeForScore(0).name).toBe("芽");
    expect(gradeForScore(49).name).toBe("芽");
    expect(gradeForScore(50).name).toBe("双葉");
    expect(gradeForScore(200).name).toBe("若木");
    expect(gradeForScore(9999).name).toBe("大樹");
  });
});

describe("nextGrade", () => {
  it("reports remaining points to the next grade", () => {
    expect(nextGrade(0)).toMatchObject({ remaining: 50 });
    expect(nextGrade(40)?.remaining).toBe(10);
    expect(nextGrade(10000)).toBeNull(); // 最上位
  });
});

describe("gradeCrossed (昇格通知の判定)", () => {
  it("returns the new grade only when a threshold is crossed", () => {
    expect(gradeCrossed(48, 52)?.name).toBe("双葉");
    expect(gradeCrossed(52, 60)).toBeNull(); // 同一グレード内
    expect(gradeCrossed(0, 0)).toBeNull();
  });
});

describe("isEmpathyMilestone (F5 節目通知)", () => {
  it("only true at configured milestones", () => {
    expect(isEmpathyMilestone(1)).toBe(true);
    expect(isEmpathyMilestone(5)).toBe(true);
    expect(isEmpathyMilestone(10)).toBe(true);
    expect(isEmpathyMilestone(2)).toBe(false);
    expect(isEmpathyMilestone(11)).toBe(false);
  });
});
