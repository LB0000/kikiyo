"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { getAuthUser } from "@/lib/auth";
import { updateLiverSchema } from "@/lib/validations/liver";
import type { ApplicationStatus } from "@/lib/supabase/types";

export type LiverRow = {
  id: string;
  name: string | null;
  account_name: string | null;
  liver_id: string | null;
  email: string | null;
  tiktok_username: string | null;
  status: ApplicationStatus;
  link: string | null;
  address: string | null;
  contact: string | null;
  birth_date: string | null;
  acquisition_date: string | null;
  streaming_start_date: string | null;
  agency_id: string | null;
  agency_name?: string;
};

export async function getLivers(): Promise<LiverRow[]> {
  const user = await getAuthUser();
  if (!user) return [];

  const supabase = await createClient();

  // ライバーと代理店を並列取得
  const [{ data: livers, error }, { data: allAgencies }] = await Promise.all([
    supabase
      .from("livers")
      .select("*")
      .order("created_at", { ascending: false }),
    supabase.from("agencies").select("id, name"),
  ]);

  if (error || !livers) return [];

  const agencyMap = new Map(
    (allAgencies ?? []).map((a) => [a.id, a.name])
  );

  return livers.map((liver) => ({
    id: liver.id,
    name: liver.name,
    account_name: liver.account_name,
    liver_id: liver.liver_id,
    email: liver.email,
    tiktok_username: liver.tiktok_username,
    status: liver.status,
    link: liver.link,
    address: liver.address,
    contact: liver.contact,
    birth_date: liver.birth_date,
    acquisition_date: liver.acquisition_date,
    streaming_start_date: liver.streaming_start_date,
    agency_id: liver.agency_id,
    agency_name: liver.agency_id ? agencyMap.get(liver.agency_id) : undefined,
  }));
}

export async function updateLiver(
  id: string,
  data: {
    name?: string | null;
    account_name?: string | null;
    liver_id?: string | null;
    email?: string | null;
    tiktok_username?: string | null;
    link?: string | null;
    address?: string | null;
    contact?: string | null;
    birth_date?: string | null;
    acquisition_date?: string | null;
    streaming_start_date?: string | null;
  }
) {
  const user = await getAuthUser();
  if (!user) return { error: "認証が必要です" };

  const parsed = updateLiverSchema.safeParse(data);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "入力値が不正です" };
  }

  const supabase = await createClient();

  // agency_userは閲覧可能代理店のライバーのみ更新可能
  if (user.role !== "system_admin") {
    const { data: liver } = await supabase
      .from("livers")
      .select("agency_id")
      .eq("id", id)
      .single();

    if (!liver) return { error: "ライバーが見つかりません" };

    const { data: viewable } = await supabase
      .from("profile_viewable_agencies")
      .select("agency_id")
      .eq("profile_id", user.id);

    const viewableIds = (viewable ?? []).map((v) => v.agency_id);
    if (!liver.agency_id || !viewableIds.includes(liver.agency_id)) {
      return { error: "権限がありません" };
    }
  }

  const { error } = await supabase
    .from("livers")
    .update(parsed.data)
    .eq("id", id);

  if (error) {
    return { error: error.message };
  }

  revalidatePath("/livers");
  return { success: true };
}

export async function updateLiverStatus(id: string, status: ApplicationStatus) {
  const user = await getAuthUser();
  if (!user) return { error: "認証が必要です" };
  if (user.role !== "system_admin") return { error: "権限がありません" };

  const supabase = await createClient();

  const { error } = await supabase
    .from("livers")
    .update({ status })
    .eq("id", id);

  if (error) {
    return { error: error.message };
  }

  revalidatePath("/livers");
  return { success: true };
}

export async function bulkUpdateLiverStatus(
  ids: string[],
  status: ApplicationStatus
) {
  const user = await getAuthUser();
  if (!user) return { error: "認証が必要です" };
  if (user.role !== "system_admin") return { error: "権限がありません" };

  const supabase = await createClient();

  const { error } = await supabase
    .from("livers")
    .update({ status })
    .in("id", ids);

  if (error) {
    return { error: error.message };
  }

  revalidatePath("/livers");
  return { success: true };
}
