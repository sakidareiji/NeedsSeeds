import nodemailer from "nodemailer";

/**
 * トランザクションメール送信(F8拡張: 再訪トリガー)。
 *
 * 接続先は SMTP_* 環境変数で指定する。未設定のときは、開発環境では
 * Supabase ローカルの Mailpit(127.0.0.1:54325 / config.toml smtp_port)へ、
 * 本番では送信をスキップする(メールが止まってもサービス本体は動かす)。
 */
const SMTP_HOST =
  process.env.SMTP_HOST ??
  (process.env.NODE_ENV !== "production" ? "127.0.0.1" : null);
const SMTP_PORT = Number(process.env.SMTP_PORT ?? 54325);
const EMAIL_FROM =
  process.env.EMAIL_FROM ?? "Needs Seeds <noreply@needs-seeds.local>";

function createTransport() {
  if (!SMTP_HOST) return null;
  return nodemailer.createTransport({
    host: SMTP_HOST,
    port: SMTP_PORT,
    // 465 は SMTPS、それ以外(587等)は STARTTLS に自動フォールバック
    secure: SMTP_PORT === 465,
    ...(process.env.SMTP_USER
      ? {
          auth: {
            user: process.env.SMTP_USER,
            pass: process.env.SMTP_PASS ?? "",
          },
        }
      : {}),
  });
}

/**
 * メールを1通送る。失敗しても例外は投げない(呼び出し元の処理を
 * メール障害で巻き込まないため)。送れたかどうかだけ返す。
 */
export async function sendEmail(input: {
  to: string;
  subject: string;
  text: string;
}): Promise<boolean> {
  const transport = createTransport();
  if (!transport) {
    console.warn("[email] SMTP_HOST 未設定のため送信をスキップしました");
    return false;
  }
  try {
    await transport.sendMail({
      from: EMAIL_FROM,
      to: input.to,
      subject: input.subject,
      text: input.text,
    });
    return true;
  } catch (e) {
    console.error("[email] 送信に失敗しました", e);
    return false;
  }
}
