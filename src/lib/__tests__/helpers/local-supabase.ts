/**
 * 統合テスト用のローカル Supabase 接続情報。
 * `supabase start` が動いていなければテスト側で自動スキップする。
 * (テストファイル名の規約に合わないので vitest には拾われない)
 */
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

function loadEnvLocal(): Record<string, string> {
  try {
    const txt = readFileSync(resolve(__dirname, "../../../../.env.local"), "utf8");
    return Object.fromEntries(
      txt
        .split("\n")
        .map((l) => l.trim())
        .filter((l) => l && !l.startsWith("#") && l.includes("="))
        .map((l) => {
          const i = l.indexOf("=");
          return [l.slice(0, i).trim(), l.slice(i + 1).trim()] as const;
        })
    );
  } catch {
    return {};
  }
}

const env = { ...loadEnvLocal(), ...process.env };

export const url = env.NEXT_PUBLIC_SUPABASE_URL ?? "";
export const anonKey = env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "";
export const serviceKey = env.SUPABASE_SERVICE_ROLE_KEY ?? "";

/**
 * describe.skipIf でも中身は評価されるため、Supabase が無い環境(CI など)で
 * createClient が "supabaseUrl is required" を投げないようにするための値。
 */
export const FALLBACK_URL = "http://skipped";
export const FALLBACK_KEY = "skipped";

export async function supabaseAvailable(): Promise<boolean> {
  if (!url || !anonKey || !serviceKey) return false;
  try {
    // .env.local はあるが Supabase(Docker)が固まっている場合、タイムアウトを
    // 付けないと接続待ちで npm test が何分も止まる。応答しなければ「無し」扱い。
    const res = await fetch(`${url}/auth/v1/health`, {
      headers: { apikey: anonKey },
      signal: AbortSignal.timeout(3000),
    });
    return res.ok;
  } catch {
    return false;
  }
}
