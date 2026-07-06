import { describe, it, expect } from "vitest";
import { parseSeedRows, parseCsv } from "@/lib/admin/import";

describe("parseCsv", () => {
  it("handles quoted fields with commas and newlines", () => {
    const csv = 'title,body\n"a, b","line1\nline2"\nx,y';
    const table = parseCsv(csv);
    expect(table).toEqual([
      ["title", "body"],
      ["a, b", "line1\nline2"],
      ["x", "y"],
    ]);
  });
});

describe("parseSeedRows CSV (F10 種投稿インポート)", () => {
  const header = "title,body,category,severity,frequency";

  it("parses valid rows and reports invalid ones", () => {
    const csv = [
      header,
      "確定申告が不安,毎年やり方を忘れて困る,money-tax,4,monthly",
      "空タイトル,,tools,3,", // body 空 → 無効
      "重すぎ,本文OK,tools,9,", // severity 範囲外 → 無効
    ].join("\n");
    const { rows, errors } = parseSeedRows(csv, "csv");
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({
      title: "確定申告が不安",
      category: "money-tax",
      severity: 4,
      frequency: "monthly",
    });
    expect(errors).toHaveLength(2);
  });

  it("normalizes empty frequency to null", () => {
    const csv = [header, "件名,本文です,tools,2,"].join("\n");
    const { rows } = parseSeedRows(csv, "csv");
    expect(rows[0].frequency).toBeNull();
  });

  it("can parse 50 valid rows (acceptance: CSVで種投稿50件)", () => {
    const body = Array.from({ length: 50 }, (_, i) => `件名${i},本文${i}です,tools,3,`).join("\n");
    const { rows, errors } = parseSeedRows(`${header}\n${body}`, "csv");
    expect(rows).toHaveLength(50);
    expect(errors).toHaveLength(0);
  });
});

describe("parseSeedRows JSON", () => {
  it("parses a JSON array of objects", () => {
    const json = JSON.stringify([
      { title: "件名", body: "本文です", category: "tools", severity: 3 },
      { title: "", body: "x", category: "tools", severity: 3 }, // 無効
    ]);
    const { rows, errors } = parseSeedRows(json, "json");
    expect(rows).toHaveLength(1);
    expect(errors).toHaveLength(1);
  });

  it("rejects non-array JSON", () => {
    const { rows, errors } = parseSeedRows('{"title":"x"}', "json");
    expect(rows).toHaveLength(0);
    expect(errors.length).toBeGreaterThan(0);
  });
});
