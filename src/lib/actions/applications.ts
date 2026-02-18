"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { getAuthUser } from "@/lib/auth";
import { createApplicationSchema } from "@/lib/validations/application";
import type { ApplicationStatus, FormTab } from "@/lib/supabase/types";

export type ApplicationRow = {
  id: string;
  name: string | null;
  address: string | null;
  birth_date: string | null;
  contact: string | null;
  email: string | null;
  additional_info: string | null;
  tiktok_username: string | null;
  tiktok_account_link: string | null;
  id_verified: boolean;
  status: ApplicationStatus;
  form_tab: FormTab;
  agency_id: string | null;
  liver_id: string | null;
  created_at: string;
  agency_name?: string;
};

export async function getApplications(): Promise<ApplicationRow[]> {
  const user = await getAuthUser();
  if (!user) return [];

  const supabase = await createClient();

  // 申請と代理店を並列取得
  const [{ data, error }, { data: allAgencies }] = await Promise.all([
    supabase
      .from("applications")
      .select("*")
      .order("created_at", { ascending: false }),
    supabase.from("agencies").select("id, name"),
  ]);

  if (error || !data) return [];

  const agencyMap = new Map(
    (allAgencies ?? []).map((a) => [a.id, a.name])
  );

  return data.map((app) => ({
    ...app,
    agency_name: app.agency_id ? agencyMap.get(app.agency_id) : undefined,
  }));
}

export async function createApplication(params: {
  name?: string;
  address?: string;
  birth_date?: string;
  contact?: string;
  email?: string;
  additional_info?: string;
  tiktok_username?: string;
  tiktok_account_link?: string;
  id_verified?: boolean;
  form_tab: FormTab;
  agency_id?: string;
}) {
  const user = await getAuthUser();
  if (!user) return { error: "認証が必要です" };

  const parsed = createApplicationSchema.safeParse(params);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "入力値が不正です" };
  }
  const v = parsed.data;

  const supabase = await createClient();

  // agency_idが指定された場合、閲覧可能代理店かチェック
  if (v.agency_id && user.role !== "system_admin") {
    const { data: viewable } = await supabase
      .from("profile_viewable_agencies")
      .select("agency_id")
      .eq("profile_id", user.id);
    const viewableIds = (viewable ?? []).map((va) => va.agency_id);
    if (!viewableIds.includes(v.agency_id)) {
      return { error: "指定された代理店へのアクセス権限がありません" };
    }
  }

  const { error } = await supabase.from("applications").insert({
    name: v.name || null,
    address: v.address || null,
    birth_date: v.birth_date || null,
    contact: v.contact || null,
    email: v.email || null,
    additional_info: v.additional_info || null,
    tiktok_username: v.tiktok_username || null,
    tiktok_account_link: v.tiktok_account_link || null,
    id_verified: v.id_verified ?? false,
    status: "pending",
    form_tab: v.form_tab,
    agency_id: v.agency_id || null,
  });

  if (error) {
    return { error: error.message };
  }

  revalidatePath("/applications");
  revalidatePath("/all-applications");
  return { success: true };
}

export async function updateApplicationStatus(
  id: string,
  status: ApplicationStatus
) {
  const user = await getAuthUser();
  if (!user) return { error: "認証が必要です" };
  if (user.role !== "system_admin") return { error: "権限がありません" };

  const supabase = await createClient();

  const { error } = await supabase
    .from("applications")
    .update({ status })
    .eq("id", id);

  if (error) {
    return { error: error.message };
  }

  // 紐付け申請が承認された場合、ライバーレコードを作成
  if (status === "authorized") {
    const { data: app } = await supabase
      .from("applications")
      .select("*")
      .eq("id", id)
      .single();

    if (app && app.form_tab === "affiliation_check" && app.agency_id) {
      const { error: liverError } = await supabase.from("livers").insert({
        name: app.name || null,
        address: app.address || null,
        birth_date: app.birth_date || null,
        contact: app.contact || null,
        email: app.email || null,
        tiktok_username: app.tiktok_username || null,
        link: app.tiktok_account_link || null,
        status: "authorized" as ApplicationStatus,
        agency_id: app.agency_id,
      });

      if (liverError) {
        return { error: `ステータスは更新しましたが、ライバー作成に失敗: ${liverError.message}` };
      }

      revalidatePath("/livers");
    }
  }

  revalidatePath("/all-applications");
  return { success: true };
}
