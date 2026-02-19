import { cache } from "react";
import { createClient } from "@/lib/supabase/server";
import type { UserRole } from "@/lib/supabase/types";

export type AuthUser = {
  id: string;
  email: string;
  role: UserRole;
  agencyId: string | null;
};

export const getAuthUser = cache(async (): Promise<AuthUser | null> => {
  const supabase = await createClient();

  // getUser() は JWT を Supabase Auth サーバーで検証（改ざん防止）
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return null;

  // app_metadata に role が設定済みなら DB クエリ不要（< 1ms）
  const metaRole = user.app_metadata?.role as UserRole | undefined;
  if (metaRole) {
    return {
      id: user.id,
      email: user.email ?? "",
      role: metaRole,
      agencyId: (user.app_metadata?.agency_id as string) ?? null,
    };
  }

  // フォールバック: app_metadata 未設定ユーザー（移行前）は profiles テーブルを参照
  const { data: profile } = await supabase
    .from("profiles")
    .select("role, agency_id")
    .eq("id", user.id)
    .single();

  if (!profile) return null;

  return {
    id: user.id,
    email: user.email ?? "",
    role: profile.role,
    agencyId: profile.agency_id,
  };
});
