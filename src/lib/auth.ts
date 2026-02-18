import { createClient } from "@/lib/supabase/server";
import type { UserRole } from "@/lib/supabase/types";

export type AuthUser = {
  id: string;
  email: string;
  role: UserRole;
  agencyId: string | null;
};

export async function getAuthUser(): Promise<AuthUser | null> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

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
}
