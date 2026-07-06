/**
 * 通報理由の定義(F7)。クライアントコンポーネントからも参照するため、
 * Server Actions 専用ファイル(reports/actions.ts の "use server")とは
 * 分離している("use server" ファイルは非同期関数以外をエクスポートできず、
 * クライアント側からは undefined になってしまうため)。
 */
export const REPORT_REASONS = [
  { value: "spam", label: "スパム・宣伝" },
  { value: "abuse", label: "誹謗中傷・攻撃的" },
  { value: "privacy", label: "個人情報が含まれる" },
  { value: "sensitive", label: "センシティブ・不適切" },
  { value: "other", label: "その他" },
] as const;

export type ReportReason = (typeof REPORT_REASONS)[number]["value"];
