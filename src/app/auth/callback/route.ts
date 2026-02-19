import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const tokenHash = searchParams.get("token_hash");
  const type = searchParams.get("type");
  const next = searchParams.get("next") ?? "/dashboard";

  // オープンリダイレクト防止: 相対パスのみ許可
  const safeNext =
    next.startsWith("/") && !next.startsWith("//") ? next : "/dashboard";

  const supabase = await createClient();

  if (tokenHash && type) {
    // token_hash 方式（パスワードリセット等）
    const { error } = await supabase.auth.verifyOtp({
      token_hash: tokenHash,
      type: type as "recovery",
    });

    if (!error) {
      return NextResponse.redirect(`${origin}${safeNext}`);
    }
  } else if (code) {
    // code 方式（PKCEフロー）
    const { error } = await supabase.auth.exchangeCodeForSession(code);

    if (!error) {
      return NextResponse.redirect(`${origin}${safeNext}`);
    }
  }

  // 認証失敗時はログインへ
  return NextResponse.redirect(`${origin}/login`);
}
