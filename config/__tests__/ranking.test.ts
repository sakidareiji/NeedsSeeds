import { describe, it, expect } from "vitest";
import { featuredScore, recencyScore } from "@config/ranking";

describe("recencyScore", () => {
  it("is 1 for a just-created post and decays over time", () => {
    const now = new Date("2026-01-01T00:00:00Z");
    expect(recencyScore(now, now)).toBeCloseTo(1, 5);
    const old = new Date("2025-12-30T00:00:00Z"); // 48h earlier = one half-life
    expect(recencyScore(old, now)).toBeCloseTo(0.5, 2);
  });
});

describe("featuredScore", () => {
  const now = new Date("2026-01-01T00:00:00Z");

  it("ranks higher quality above lower quality, all else equal", () => {
    const high = featuredScore({ createdAt: now, empathyCount: 0, qualityScore: 90, now });
    const low = featuredScore({ createdAt: now, empathyCount: 0, qualityScore: 10, now });
    expect(high).toBeGreaterThan(low);
  });

  it("treats unassessed (null) quality as neutral, not zero", () => {
    const unassessed = featuredScore({ createdAt: now, empathyCount: 0, qualityScore: null, now });
    const zero = featuredScore({ createdAt: now, empathyCount: 0, qualityScore: 0, now });
    expect(unassessed).toBeGreaterThan(zero);
  });

  it("rewards empathy", () => {
    const many = featuredScore({ createdAt: now, empathyCount: 50, qualityScore: 50, now });
    const none = featuredScore({ createdAt: now, empathyCount: 0, qualityScore: 50, now });
    expect(many).toBeGreaterThan(none);
  });
});
