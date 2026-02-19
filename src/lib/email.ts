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
