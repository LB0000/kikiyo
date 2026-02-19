"use server";

import { createAdminClient } from "@/lib/supabase/server";
import {
  sendEmail,
  escapeHtml,
  getValidAppUrl,
  wrapEmailLayout,
} from "@/lib/email";

export async function requestPasswordReset(email: string) {
  const trimmed = email.trim();
  if (!trimmed) {
    return { error: "メールアドレスを入力してください" };
  }

  const adminSupabase = createAdminClient();
  const appUrl = getValidAppUrl();

  // Supabase Admin APIでリカバリーリンクを生成
  const { data, error } = await adminSupabase.auth.admin.generateLink({
    type: "recovery",
    email: trimmed,
    options: {
      redirectTo: `${appUrl}/auth/callback?next=/reset-password`,
    },
  });

  if (error || !data.properties?.hashed_token) {
    // ユーザーが存在しない場合もセキュリティ上同じメッセージを返す
    return { success: true };
  }

  // アプリ直通のリセットリンクを構築（Supabaseリダイレクトに依存しない）
  const tokenHash = data.properties.hashed_token;
  const resetLink = `${appUrl}/auth/callback?token_hash=${encodeURIComponent(tokenHash)}&type=recovery&next=/reset-password`;

  // Resend経由でリセットメールを送信
  try {
    const safeEmail = escapeHtml(trimmed);
    const safeResetLink = escapeHtml(resetLink);

    await sendEmail({
      to: trimmed,
      subject: "【KIKIYO LIVE MANAGER】パスワードリセット",
      html: wrapEmailLayout(`
        <h2 style="margin:0 0 24px;color:#111827;font-size:20px;font-weight:700;">
          パスワードリセット
        </h2>

        <p style="margin:0 0 16px;color:#374151;font-size:15px;line-height:1.6;">
          ${safeEmail} 様
        </p>

        <p style="margin:0 0 8px;color:#374151;font-size:15px;line-height:1.6;">
          パスワードリセットのリクエストを受け付けました。
        </p>
        <p style="margin:0 0 8px;color:#374151;font-size:15px;line-height:1.6;">
          以下のボタンをクリックして、新しいパスワードを設定してください。
        </p>

        <!-- CTA Button -->
        <div style="text-align:center;margin:28px 0;">
          <a href="${safeResetLink}" style="display:inline-block;background-color:#0f172a;color:#ffffff;text-decoration:none;padding:14px 40px;border-radius:8px;font-size:15px;font-weight:600;">
            パスワードをリセットする
          </a>
        </div>

        <!-- Note -->
        <div style="border-top:1px solid #e5e7eb;padding-top:20px;margin-top:20px;">
          <p style="margin:0 0 8px;color:#6b7280;font-size:13px;line-height:1.6;">
            このリンクは24時間有効です。
          </p>
          <p style="margin:0;color:#6b7280;font-size:13px;line-height:1.6;">
            心当たりがない場合は、このメールを無視してください。アカウントに変更は加えられません。
          </p>
        </div>
      `),
    });
  } catch (e) {
    console.error("[requestPasswordReset]", e instanceof Error ? e.message : e);
    return { error: "メール送信に失敗しました。しばらくしてからお試しください。" };
  }

  return { success: true };
}
