import { NextResponse } from "next/server";
import type { EmailOtpType } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";

/**
 * 遷移先が自サイト内の相対パスかを検証する(オープンリダイレクト防止)。
 * `//evil.com` や `/\evil.com` はブラウザが別オリジンとして解釈するため弾く。
 */
function safeNext(next: string | null): string {
  if (!next || !next.startsWith("/")) return "/";
  if (next.startsWith("//") || next.startsWith("/\\")) return "/";
  return next;
}

/**
 * メール内リンクの着地点(F1)。token_hash を検証してセッションを確立する。
 * token_hash 方式なので、登録したブラウザと別のブラウザで開いても検証できる
 * (PKCE の code 交換と違い code_verifier を必要としない)。
 *
 * - 新規登録の確認: `?token_hash=...&type=email` → トップへ
 * - パスワード再設定: `?token_hash=...&type=recovery&next=/reset-password`
 *   → セッションが張られた状態で新しいパスワードの入力画面へ送る
 */
export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const tokenHash = searchParams.get("token_hash");
  const type = searchParams.get("type") as EmailOtpType | null;
  const next = safeNext(searchParams.get("next"));

  if (tokenHash && type) {
    const supabase = createClient();
    const { error } = await supabase.auth.verifyOtp({
      type,
      token_hash: tokenHash,
    });
    if (!error) {
      return NextResponse.redirect(`${origin}${next}`);
    }
  }

  // 再設定リンクの失敗はログイン画面ではなく再送画面へ送る(やり直せる導線)。
  if (type === "recovery") {
    return NextResponse.redirect(`${origin}/forgot-password?error=expired`);
  }
  return NextResponse.redirect(`${origin}/login?error=confirm`);
}
