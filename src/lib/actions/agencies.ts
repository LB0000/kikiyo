"use server";

import { createClient, createAdminClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { getAuthUser } from "@/lib/auth";
import {
  agencyFormSchema,
  type AgencyFormValues,
} from "@/lib/validations/agency";

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

  const { data: agencies, error } = await supabase
    .from("agencies")
    .select("*")
    .order("created_at", { ascending: false });

  if (error || !agencies) return [];

  const { data: hierarchy } = await supabase
    .from("agency_hierarchy")
    .select("agency_id, parent_agency_id");

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

  const adminSupabase = await createAdminClient();
  const supabase = await createClient();

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
    });

  if (authError || !authData.user) {
    // ロールバック
    await supabase.from("agencies").delete().eq("id", agency.id);
    return { error: authError?.message ?? "ユーザー作成に失敗しました" };
  }

  // 4. 代理店にuser_idを設定
  const { error: linkError } = await supabase
    .from("agencies")
    .update({ user_id: authData.user.id })
    .eq("id", agency.id);

  if (linkError) {
    await supabase.from("agencies").delete().eq("id", agency.id);
    await adminSupabase.auth.admin.deleteUser(authData.user.id);
    return { error: "代理店とユーザーの紐付けに失敗しました" };
  }

  // 5. profileにagency_idを設定
  const { error: profileError } = await adminSupabase
    .from("profiles")
    .update({ agency_id: agency.id })
    .eq("id", authData.user.id);

  if (profileError) {
    await supabase.from("agencies").delete().eq("id", agency.id);
    await adminSupabase.auth.admin.deleteUser(authData.user.id);
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
    await supabase.from("agencies").delete().eq("id", agency.id);
    await adminSupabase.auth.admin.deleteUser(authData.user.id);
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
  try {
    await sendRegistrationEmail(values.email, tempPassword, values.name);
  } catch {
    // メール送信失敗してもアカウント作成は成功
  }

  revalidatePath("/agencies");
  return { success: true, tempPassword };
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
  const bytes = new Uint8Array(12);
  crypto.getRandomValues(bytes);
  let password = "";
  for (let i = 0; i < 12; i++) {
    password += chars.charAt(bytes[i] % chars.length);
  }
  return password;
}

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

async function sendRegistrationEmail(
  email: string,
  tempPassword: string,
  agencyName: string
) {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
  const safeAgencyName = escapeHtml(agencyName);
  const safeEmail = escapeHtml(email);
  const safePassword = escapeHtml(tempPassword);

  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
    },
    body: JSON.stringify({
      from: process.env.EMAIL_FROM ?? "TikTok Live Tool <noreply@resend.dev>",
      to: [email],
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
    }),
  });

  if (!res.ok) {
    throw new Error("メール送信に失敗しました");
  }
}
