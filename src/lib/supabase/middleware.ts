import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({
    request,
  });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          );
          supabaseResponse = NextResponse.next({
            request,
          });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  // getSession() は Cookie 読み取りのみ（ネットワーク不要、< 1ms）。
  // getUser() は Supabase Auth サーバーへ HTTP リクエストが発生し 200-500ms かかる。
  // JWT の検証は RLS が全 DB クエリで行うため、ルーティング目的には getSession() で十分。
  const {
    data: { session },
  } = await supabase.auth.getSession();

  const pathname = request.nextUrl.pathname;

  // 認証フロー用パスはリダイレクト対象外
  const isPublicPath =
    pathname === "/login" ||
    pathname === "/reset-password" ||
    pathname.startsWith("/auth/callback");

  // 未認証ユーザーを/loginにリダイレクト
  if (!session && !isPublicPath) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    return NextResponse.redirect(url);
  }

  // 認証済みユーザーがログインページにアクセスした場合（reset-passwordは許可）
  if (session && pathname === "/login") {
    const url = request.nextUrl.clone();
    url.pathname = "/dashboard";
    return NextResponse.redirect(url);
  }

  return supabaseResponse;
}
