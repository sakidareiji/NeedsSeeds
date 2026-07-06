import { z } from "zod";
import { FREQUENCIES } from "@/lib/posts/schema";

/** 種投稿1件の入力(F10 種投稿インポート)。category はカテゴリ slug。 */
export const seedRowSchema = z.object({
  title: z.string().trim().min(1).max(60),
  body: z.string().trim().min(1).max(2000),
  category: z.string().trim().min(1),
  severity: z.coerce.number().int().min(1).max(5),
  frequency: z
    .union([z.enum(FREQUENCIES), z.literal(""), z.undefined(), z.null()])
    .transform((v) => (v ? v : null)),
});

export type SeedRow = z.infer<typeof seedRowSchema>;

export type ParseResult = { rows: SeedRow[]; errors: string[] };

/** 単純な CSV パーサ(ダブルクオート・エスケープ・改行対応)。 */
export function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let field = "";
  let row: string[] = [];
  let inQuotes = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (inQuotes) {
      if (c === '"') {
        if (text[i + 1] === '"') {
          field += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        field += c;
      }
    } else if (c === '"') {
      inQuotes = true;
    } else if (c === ",") {
      row.push(field);
      field = "";
    } else if (c === "\n" || c === "\r") {
      if (c === "\r" && text[i + 1] === "\n") i++;
      row.push(field);
      rows.push(row);
      field = "";
      row = [];
    } else {
      field += c;
    }
  }
  // 末尾フィールド/行
  if (field.length > 0 || row.length > 0) {
    row.push(field);
    rows.push(row);
  }
  return rows.filter((r) => r.some((cell) => cell.trim() !== ""));
}

/**
 * CSV または JSON の種投稿を検証してパースする(F10)。
 * CSV は1行目をヘッダ(title,body,category,severity,frequency)とする。
 * @returns 妥当な行と、行ごとのエラーメッセージ
 */
export function parseSeedRows(
  text: string,
  format: "csv" | "json"
): ParseResult {
  const errors: string[] = [];
  let raw: unknown[];

  if (format === "json") {
    try {
      const parsed = JSON.parse(text);
      if (!Array.isArray(parsed)) {
        return { rows: [], errors: ["JSON はオブジェクトの配列である必要があります"] };
      }
      raw = parsed;
    } catch {
      return { rows: [], errors: ["JSON のパースに失敗しました"] };
    }
  } else {
    const table = parseCsv(text);
    if (table.length < 2) {
      return { rows: [], errors: ["CSV にヘッダ行とデータ行が必要です"] };
    }
    const header = table[0].map((h) => h.trim());
    raw = table.slice(1).map((cols) => {
      const obj: Record<string, string> = {};
      header.forEach((h, i) => (obj[h] = cols[i] ?? ""));
      return obj;
    });
  }

  const rows: SeedRow[] = [];
  raw.forEach((item, i) => {
    const parsed = seedRowSchema.safeParse(item);
    if (parsed.success) {
      rows.push(parsed.data);
    } else {
      errors.push(`${i + 1}行目: ${parsed.error.issues[0]?.message ?? "不正な行"}`);
    }
  });

  return { rows, errors };
}
