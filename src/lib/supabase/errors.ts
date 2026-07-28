/**
 * Postgres の一意制約違反(unique_violation, SQLSTATE 23505)かどうか。
 * 「既に押下済み」「既に加点済み」等の冪等スキップ判定に使う。
 */
export function isUniqueViolation(error: { code?: unknown } | null): boolean {
  return error != null && String(error.code).includes("23505");
}
