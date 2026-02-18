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

  // RLS が全 DB クエリで JWT を検証するため、
  // ここでは高速な getSession()（Cookie 読み取りのみ、ネットワーク不要）を使用
  const {
    data: { session },
  } = await supabase.auth.getSession();

  const user = session?.user;
  if (!user) return null;

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
