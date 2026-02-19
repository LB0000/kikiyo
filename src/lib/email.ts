import { Resend } from "resend";

let resendInstance: Resend | null = null;

function getResend(): Resend {
  if (!resendInstance) {
    const apiKey = process.env.RESEND_API_KEY;
    if (!apiKey) {
      throw new Error("RESEND_API_KEY が設定されていません");
    }
    resendInstance = new Resend(apiKey);
  }
  return resendInstance;
}

export type SendEmailParams = {
  to: string | string[];
  subject: string;
  html: string;
};

/**
 * Resend SDK を使ってメールを送信する。
 * 送信失敗時は Error を throw する。
 */
export async function sendEmail(params: SendEmailParams): Promise<void> {
  const from = process.env.EMAIL_FROM;
  if (!from) {
    throw new Error("EMAIL_FROM が設定されていません");
  }

  const resend = getResend();
  const { error } = await resend.emails.send({
    from,
    to: Array.isArray(params.to) ? params.to : [params.to],
    subject: params.subject,
    html: params.html,
  });

  if (error) {
    throw new Error(`メール送信に失敗しました: ${error.message}`);
  }
}

export function escapeHtml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

export function getValidAppUrl(): string {
  const rawUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
  try {
    const parsed = new URL(rawUrl);
    if (parsed.protocol !== "https:" && parsed.protocol !== "http:") {
      return "http://localhost:3000";
    }
    return parsed.origin;
  } catch {
    return "http://localhost:3000";
  }
}

/**
 * KIKIYO LIVE MANAGER 共通メールレイアウト。
 * ヘッダー・フッター付きのカード風デザイン。
 * `bodyHtml` にはメール本文のHTMLを渡す。
 */
export function wrapEmailLayout(bodyHtml: string): string {
  return `
<!DOCTYPE html>
<html lang="ja">
<head><meta charset="UTF-8" /></head>
<body style="margin:0;padding:0;background-color:#f3f4f6;font-family:'Helvetica Neue',Arial,'Hiragino Sans',sans-serif;">
  <div style="max-width:600px;margin:0 auto;padding:24px 16px;">

    <!-- Header -->
    <div style="background-color:#0f172a;border-radius:12px 12px 0 0;padding:24px 32px;">
      <h1 style="margin:0;color:#ffffff;font-size:18px;font-weight:700;letter-spacing:0.5px;">
        KIKIYO LIVE MANAGER
      </h1>
    </div>

    <!-- Body -->
    <div style="background-color:#ffffff;padding:32px;border-left:1px solid #e5e7eb;border-right:1px solid #e5e7eb;">
      ${bodyHtml}
    </div>

    <!-- Footer -->
    <div style="background-color:#f9fafb;border-radius:0 0 12px 12px;padding:16px 32px;border:1px solid #e5e7eb;border-top:none;">
      <p style="margin:0;color:#9ca3af;font-size:12px;text-align:center;">
        &copy; KIKIYO LIVE MANAGER &#8212; このメールは自動送信です
      </p>
    </div>

  </div>
</body>
</html>`;
}
