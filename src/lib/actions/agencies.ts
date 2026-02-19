"use server";

import { createClient, createAdminClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { getAuthUser } from "@/lib/auth";
import {
  agencyFormSchema,
  type AgencyFormValues,
} from "@/lib/validations/agency";
import {
  agencyCompanyInfoSchema,
  type AgencyCompanyInfoValues,
} from "@/lib/validations/invoice";
import { sendEmail, escapeHtml, getValidAppUrl } from "@/lib/email";

export type AgencyWithHierarchy = {
  id: string;
  name: string;
  commission_rate: number;
  rank: string | null;
  user_id: string | null;
  created_at: string;
  parent_agencies: { parent_agency_id: string; parent_name: string }[];
};

export async function getAgencies(): Promise<AgencyWithHierarchy[]> {
  const user = await getAuthUser();
  if (!user) return [];

  const supabase = await createClient();

  // 代理店と階層を並列取得
  const [{ data: agencies, error }, { data: hierarchy }] = await Promise.all([
    supabase
      .from("agencies")
      .select("id, name, commission_rate, rank, user_id, created_at")
      .order("created_at", { ascending: false }),
    supabase
      .from("agency_hierarchy")
      .select("agency_id, parent_agency_id"),
  ]);

  if (error || !agencies) return [];

  const agencyMap = new Map(agencies.map((a) => [a.id, a.name]));

  return agencies.map((agency) => ({
    id: agency.id,
    name: agency.name,
    commission_rate: agency.commission_rate,
    rank: agency.rank,
    user_id: agency.user_id,
    created_at: agency.created_at,
    parent_agencies: (hierarchy ?? [])
      .filter((h) => h.agency_id === agency.id)
      .map((h) => ({
        parent_agency_id: h.parent_agency_id,
        parent_name: agencyMap.get(h.parent_agency_id) ?? "",
      })),
  }));
}

export async function createAgency(values: AgencyFormValues) {
  const user = await getAuthUser();
  if (!user) return { error: "認証が必要です" };
  if (user.role !== "system_admin") return { error: "権限がありません" };

  const parsed = agencyFormSchema.safeParse(values);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "入力値が不正です" };
  }
  values = parsed.data;

  const adminSupabase = createAdminClient();
  const supabase = await createClient();

  // 0. メールアドレス重複チェック
  const { data: existingUsers } = await adminSupabase.auth.admin.listUsers();
  if (existingUsers?.users?.some((u) => u.email === values.email)) {
    return { error: "このメールアドレスは既に使用されています" };
  }

  // 1. 代理店レコード作成
  const { data: agency, error: agencyError } = await supabase
    .from("agencies")
    .insert({
      name: values.name,
      commission_rate: values.commission_rate,
      rank: values.rank,
    })
    .select()
    .single();

  if (agencyError || !agency) {
    return { error: agencyError?.message ?? "代理店の作成に失敗しました" };
  }

  // 2. 仮パスワード生成
  const tempPassword = generateTempPassword();

  // 3. ユーザーアカウント作成（Admin API使用）
  const { data: authData, error: authError } =
    await adminSupabase.auth.admin.createUser({
      email: values.email,
      password: tempPassword,
      email_confirm: true,
      user_metadata: { role: "agency_user" },
      app_metadata: { role: "agency_user", agency_id: agency.id },
    });

  if (authError || !authData.user) {
    await adminSupabase.from("agencies").delete().eq("id", agency.id);
    return { error: authError?.message ?? "ユーザー作成に失敗しました" };
  }

  // ロールバック用ヘルパー（adminSupabaseでRLSバイパス）
  async function rollback() {
    await Promise.all([
      adminSupabase.from("agencies").delete().eq("id", agency.id),
      adminSupabase.auth.admin.deleteUser(authData.user!.id),
    ]);
  }

  // 4. 代理店にuser_idを設定
  const { error: linkError } = await adminSupabase
    .from("agencies")
    .update({ user_id: authData.user.id })
    .eq("id", agency.id);

  if (linkError) {
    await rollback();
    return { error: "代理店とユーザーの紐付けに失敗しました" };
  }

  // 5. profileにagency_idを設定
  const { error: profileError } = await adminSupabase
    .from("profiles")
    .update({ agency_id: agency.id })
    .eq("id", authData.user.id);

  if (profileError) {
    await rollback();
    return { error: "プロフィール更新に失敗しました" };
  }

  // 6. 閲覧可能代理店に自分自身を追加
  const { error: viewableError } = await adminSupabase
    .from("profile_viewable_agencies")
    .insert({
      profile_id: authData.user.id,
      agency_id: agency.id,
    });

  if (viewableError) {
    await rollback();
    return { error: "閲覧権限の設定に失敗しました" };
  }

  // 7. 上位代理店リスト設定
  if (values.parent_agency_ids.length > 0) {
    // 自身を親に設定する循環参照を防止
    const safeParentIds = values.parent_agency_ids.filter(
      (pid) => pid !== agency.id
    );
    if (safeParentIds.length === 0) {
      revalidatePath("/agencies");
      return { success: true, tempPassword };
    }
    const hierarchyRows = safeParentIds.map((parentId) => ({
      agency_id: agency.id,
      parent_agency_id: parentId,
    }));
    await supabase.from("agency_hierarchy").insert(hierarchyRows);

    // 上位代理店のユーザーに閲覧権限を追加
    for (const parentId of safeParentIds) {
      const { data: parentAgency } = await supabase
        .from("agencies")
        .select("user_id")
        .eq("id", parentId)
        .single();

      if (parentAgency?.user_id) {
        await adminSupabase.from("profile_viewable_agencies").upsert({
          profile_id: parentAgency.user_id,
          agency_id: agency.id,
        });
      }
    }
  }

  // 8. メール送信（Resend）
  let emailError: string | null = null;
  try {
    await sendRegistrationEmail(values.email, tempPassword, values.name);
  } catch (e) {
    emailError =
      e instanceof Error ? e.message : "メール送信に失敗しました";
    console.error("[sendRegistrationEmail]", emailError);
  }

  revalidatePath("/agencies");
  return { success: true, tempPassword, emailError };
}

const updateAgencySchema = agencyFormSchema.omit({ email: true });

export async function updateAgency(
  agencyId: string,
  values: Omit<AgencyFormValues, "email">
) {
  const user = await getAuthUser();
  if (!user) return { error: "認証が必要です" };
  if (user.role !== "system_admin") return { error: "権限がありません" };

  const parsed = updateAgencySchema.safeParse(values);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "入力値が不正です" };
  }
  values = parsed.data;

  const supabase = await createClient();
  const adminSupabase = await createAdminClient();

  // 1. 旧上位代理店リストのユーザーから閲覧権限を削除
  const { data: oldHierarchy } = await supabase
    .from("agency_hierarchy")
    .select("parent_agency_id")
    .eq("agency_id", agencyId);

  if (oldHierarchy) {
    for (const h of oldHierarchy) {
      const { data: parentAgency } = await supabase
        .from("agencies")
        .select("user_id")
        .eq("id", h.parent_agency_id)
        .single();

      if (parentAgency?.user_id) {
        await adminSupabase
          .from("profile_viewable_agencies")
          .delete()
          .eq("profile_id", parentAgency.user_id)
          .eq("agency_id", agencyId);
      }
    }
  }

  // 2. 代理店情報更新
  const { error } = await supabase
    .from("agencies")
    .update({
      name: values.name,
      commission_rate: values.commission_rate,
      rank: values.rank,
    })
    .eq("id", agencyId);

  if (error) {
    return { error: error.message };
  }

  // 3. 上位代理店リスト更新
  await supabase
    .from("agency_hierarchy")
    .delete()
    .eq("agency_id", agencyId);

  // 自身を親に設定する循環参照を防止
  const safeParentIds = values.parent_agency_ids.filter(
    (pid) => pid !== agencyId
  );
  if (safeParentIds.length > 0) {
    const hierarchyRows = safeParentIds.map((parentId) => ({
      agency_id: agencyId,
      parent_agency_id: parentId,
    }));
    await supabase.from("agency_hierarchy").insert(hierarchyRows);

    // 新上位代理店のユーザーに閲覧権限を追加
    for (const parentId of safeParentIds) {
      const { data: parentAgency } = await supabase
        .from("agencies")
        .select("user_id")
        .eq("id", parentId)
        .single();

      if (parentAgency?.user_id) {
        await adminSupabase.from("profile_viewable_agencies").upsert({
          profile_id: parentAgency.user_id,
          agency_id: agencyId,
        });
      }
    }
  }

  revalidatePath("/agencies");
  return { success: true };
}

function generateTempPassword(): string {
  const chars =
    "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789";
  let password = "";
  for (let i = 0; i < 12; i++) {
    // rejection sampling でモジュロバイアスを回避
    const limit = 256 - (256 % chars.length);
    let byte: number;
    do {
      const buf = new Uint8Array(1);
      crypto.getRandomValues(buf);
      byte = buf[0];
    } while (byte >= limit);
    password += chars.charAt(byte % chars.length);
  }
  return password;
}

async function sendRegistrationEmail(
  email: string,
  tempPassword: string,
  agencyName: string
) {
  const appUrl = getValidAppUrl();
  const safeAgencyName = escapeHtml(agencyName);
  const safeEmail = escapeHtml(email);
  const safePassword = escapeHtml(tempPassword);

  await sendEmail({
    to: email,
    subject: "代理店登録通知",
    html: `
      <h2>代理店登録通知</h2>
      <p>${safeAgencyName} 様</p>
      <p>TikTok Live Toolへの代理店登録が完了しました。</p>
      <p>以下の情報でログインしてください。</p>
      <ul>
        <li><strong>メールアドレス:</strong> ${safeEmail}</li>
        <li><strong>仮パスワード:</strong> ${safePassword}</li>
      </ul>
      <p><a href="${appUrl}/login">ログインはこちら</a></p>
      <p>初回ログイン後、パスワードの変更をお勧めします。</p>
    `,
  });
}

// ---------------------------------------------------------------------------
// getAgencyCompanyInfo
// ---------------------------------------------------------------------------

export async function getAgencyCompanyInfo(agencyId: string) {
  const user = await getAuthUser();
  if (!user) return { error: "認証が必要です" };

  // 代理店ユーザーは自分の閲覧可能代理店のみアクセス可能
  if (user.role !== "system_admin") {
    const supabaseCheck = await createClient();
    const { data: viewable } = await supabaseCheck
      .from("profile_viewable_agencies")
      .select("agency_id")
      .eq("profile_id", user.id);
    const viewableIds = (viewable ?? []).map((v) => v.agency_id);
    if (!viewableIds.includes(agencyId)) {
      return { error: "権限がありません" };
    }
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("agencies")
    .select(
      "id, name, invoice_registration_number, company_address, representative_name, bank_name, bank_branch, bank_account_type, bank_account_number, bank_account_holder"
    )
    .eq("id", agencyId)
    .single();

  if (error) console.error("[getAgencyCompanyInfo]", error.message);
  if (error || !data) return { error: "代理店情報の取得に失敗しました" };
  return { data };
}

// ---------------------------------------------------------------------------
// updateAgencyCompanyInfo
// ---------------------------------------------------------------------------

export async function updateAgencyCompanyInfo(
  agencyId: string,
  values: AgencyCompanyInfoValues
) {
  const user = await getAuthUser();
  if (!user) return { error: "認証が必要です" };
  if (user.role !== "system_admin") return { error: "権限がありません" };

  const parsed = agencyCompanyInfoSchema.safeParse(values);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "入力値が不正です" };
  }
  const v = parsed.data;

  const supabase = await createClient();

  const { error } = await supabase
    .from("agencies")
    .update({
      invoice_registration_number: v.invoice_registration_number || null,
      company_address: v.company_address || null,
      representative_name: v.representative_name || null,
      bank_name: v.bank_name || null,
      bank_branch: v.bank_branch || null,
      bank_account_type: (v.bank_account_type || null) as "futsu" | "toza" | null,
      bank_account_number: v.bank_account_number || null,
      bank_account_holder: v.bank_account_holder || null,
    })
    .eq("id", agencyId);

  if (error) {
    return { error: error.message };
  }

  revalidatePath("/agencies");
  return { success: true };
}
