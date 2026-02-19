"use server";

import { createAdminClient } from "@/lib/supabase/server";
import { sendEmail, escapeHtml, getValidAppUrl } from "@/lib/email";

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

    await sendEmail({
      to: trimmed,
      subject: "パスワードリセット",
      html: `
        <h2>パスワードリセット</h2>
        <p>${safeEmail} 様</p>
        <p>パスワードリセットのリクエストを受け付けました。</p>
        <p>以下のリンクをクリックして、新しいパスワードを設定してください。</p>
        <p><a href="${resetLink}">パスワードをリセットする</a></p>
        <p>このリンクは24時間有効です。</p>
        <p>心当たりがない場合は、このメールを無視してください。</p>
      `,
    });
  } catch (e) {
    console.error("[requestPasswordReset]", e instanceof Error ? e.message : e);
    return { error: "メール送信に失敗しました。しばらくしてからお試しください。" };
  }

  return { success: true };
}
