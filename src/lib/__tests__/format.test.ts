import { describe, it, expect } from "vitest";
import { slugify, postHandle, idFromHandle } from "@/lib/format";

const UUID = "123e4567-e89b-12d3-a456-426614174000";

describe("slugify", () => {
  it("keeps Japanese characters and collapses separators", () => {
    expect(slugify("確定申告が わからない！")).toBe("確定申告が-わからない");
  });
  it("falls back to 'post' for empty result", () => {
    expect(slugify("!!!")).toBe("post");
  });
});

describe("postHandle / idFromHandle", () => {
  it("round-trips the id through a handle", () => {
    const handle = postHandle(UUID, "請求書ツールを探している");
    expect(handle.startsWith(UUID)).toBe(true);
    expect(idFromHandle(handle)).toBe(UUID);
  });
  it("extracts the id even without a slug", () => {
    expect(idFromHandle(UUID)).toBe(UUID);
  });
  it("returns null for a non-uuid handle", () => {
    expect(idFromHandle("not-a-real-id-slug")).toBeNull();
  });
});
