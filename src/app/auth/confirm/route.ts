import { NextResponse } from "next/server";
import type { EmailOtpType } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";

/**
 * メール確認リンクの着地点(F1)。メールテンプレートの
 * `/auth/confirm?token_hash=...&type=email` を検証してセッションを確立する。
 * token_hash 方式なので、登録したブラウザと別のブラウザで開いても検証できる
 * (PKCE の code 交換と違い code_verifier を必要としない)。
 */
export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const tokenHash = searchParams.get("token_hash");
  const type = searchParams.get("type") as EmailOtpType | null;

  if (tokenHash && type) {
    const supabase = createClient();
    const { error } = await supabase.auth.verifyOtp({
      type,
      token_hash: tokenHash,
    });
    if (!error) {
      return NextResponse.redirect(`${origin}/`);
    }
  }

  return NextResponse.redirect(`${origin}/login?error=confirm`);
}
