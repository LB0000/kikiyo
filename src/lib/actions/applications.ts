"use server";

import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { getAuthUser } from "@/lib/auth";
import { createApplicationSchema } from "@/lib/validations/application";
import type { ApplicationStatus, FormTab } from "@/lib/supabase/types";

const applicationStatusSchema = z.enum([
  "completed", "released", "authorized", "pending", "rejected",
]);

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
  form_data: Record<string, unknown> | null;
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
  form_data?: Record<string, unknown>;
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
    form_data: v.form_data ?? {},
  });

  if (error) {
    console.error("[createApplication]", error.message);
    return { error: "申請の作成に失敗しました" };
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

  const parsed = applicationStatusSchema.safeParse(status);
  if (!parsed.success) return { error: "無効なステータスです" };
  const validStatus = parsed.data;

  const supabase = await createClient();

  // 紐付け申請の承認時はライバー作成も行うため、先に申請データを取得
  let app: { form_tab: string; agency_id: string | null; name: string | null; tiktok_username: string | null; address: string | null; birth_date: string | null; contact: string | null; email: string | null; tiktok_account_link: string | null } | null = null;
  if (validStatus === "authorized") {
    const { data, error: fetchError } = await supabase
      .from("applications")
      .select("form_tab, agency_id, name, tiktok_username, address, birth_date, contact, email, tiktok_account_link")
      .eq("id", id)
      .single();
    if (fetchError) {
      console.error("[updateApplicationStatus] fetch:", fetchError.message);
      return { error: "申請データの取得に失敗しました" };
    }
    app = data;
  }

  // 楽観的ロック: 承認時は現在のステータスが pending の場合のみ更新（重複処理防止）
  if (validStatus === "authorized") {
    const { data: updated, error } = await supabase
      .from("applications")
      .update({ status: validStatus })
      .eq("id", id)
      .eq("status", "pending")
      .select("id");

    if (error) {
      return { error: "ステータスの更新に失敗しました" };
    }

    if (!updated || updated.length === 0) {
      return { error: "この申請は既に処理済みです" };
    }
  } else {
    const { data: updatedApp, error } = await supabase
      .from("applications")
      .update({ status: validStatus })
      .eq("id", id)
      .select("liver_id, form_tab, tiktok_username, agency_id")
      .single();

    if (error) {
      return { error: "ステータスの更新に失敗しました" };
    }

    // 紐付いたライバーが存在する場合、ライバーのステータスも同期
    let targetLiverId = updatedApp?.liver_id;

    // liver_id が未設定だが紐付け申請の場合、tiktok_username + agency_id でライバーを検索
    if (!targetLiverId && updatedApp?.form_tab === "affiliation_check" && updatedApp.tiktok_username) {
      let query = supabase
        .from("livers")
        .select("id")
        .ilike("tiktok_username", updatedApp.tiktok_username);
      if (updatedApp.agency_id) {
        query = query.eq("agency_id", updatedApp.agency_id);
      }
      const { data: matchedLiver } = await query.limit(1).maybeSingle();
      if (matchedLiver) {
        targetLiverId = matchedLiver.id;
        // liver_id を申請に紐付け（次回以降は直接参照可能に）
        await supabase
          .from("applications")
          .update({ liver_id: matchedLiver.id })
          .eq("id", id);
      }
    }

    if (targetLiverId) {
      const { error: syncError } = await supabase
        .from("livers")
        .update({ status: validStatus })
        .eq("id", targetLiverId);

      if (syncError) {
        console.error("[updateApplicationStatus] liver sync:", syncError.message);
        revalidatePath("/all-applications");
        return { error: "申請ステータスは更新しましたが、ライバー名簿への反映に失敗しました" };
      }

      revalidatePath("/livers");
    }

    revalidatePath("/all-applications");
    return { success: true, liverCreated: false };
  }

  // 紐付け申請が承認された場合、ライバーレコードを作成
  if (validStatus === "authorized" && app && app.form_tab === "affiliation_check") {
    if (!app.agency_id) {
      revalidatePath("/all-applications");
      return { error: "ステータスは更新しましたが、代理店が未設定のためライバーを作成できませんでした" };
    }

    const { data: newLiver, error: liverError } = await supabase.from("livers").insert({
      name: app.name || null,
      account_name: app.tiktok_username || null,
      address: app.address || null,
      birth_date: app.birth_date || null,
      contact: app.contact || null,
      email: app.email || null,
      tiktok_username: app.tiktok_username || null,
      link: app.tiktok_account_link || null,
      status: "authorized" as ApplicationStatus,
      agency_id: app.agency_id,
      acquisition_date: new Date().toISOString().slice(0, 10),
    }).select("id").single();

    if (liverError) {
      console.error("[updateApplicationStatus] liver:", liverError.message);
      revalidatePath("/all-applications");
      return { error: "ステータスは更新しましたが、ライバー作成に失敗しました" };
    }

    // 作成したライバーのIDを申請レコードに紐付け
    if (newLiver) {
      const { error: linkError } = await supabase
        .from("applications")
        .update({ liver_id: newLiver.id })
        .eq("id", id);
      if (linkError) {
        console.error("申請へのライバーID紐付けに失敗:", linkError.message);
      }
    }

    revalidatePath("/livers");
    revalidatePath("/all-applications");
    return { success: true, liverCreated: true };
  }

  revalidatePath("/all-applications");
  return { success: true, liverCreated: false };
}
