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
  email: string | null;
  created_at: string;
  parent_agencies: { parent_agency_id: string; parent_name: string }[];
  registration_email_sent_at: string | null;
  last_sign_in_at: string | null;
};

export async function getAgencies(): Promise<AgencyWithHierarchy[]> {
  const user = await getAuthUser();
  if (!user) return [];

  const supabase = await createClient();
  const isAdmin = user.role === "system_admin";

  // 代理店と階層を並列取得
  const [{ data: agencies, error }, { data: hierarchy }] = await Promise.all([
    supabase
      .from("agencies")
      .select("id, name, commission_rate, rank, user_id, created_at, registration_email_sent_at")
      .order("created_at", { ascending: false }),
    supabase
      .from("agency_hierarchy")
      .select("agency_id, parent_agency_id"),
  ]);

  if (error || !agencies) return [];

  // 管理者のみ: Supabase Auth からメール・最終ログイン日時を取得
  const authUserMap = new Map<string, { email: string | null; last_sign_in_at: string | null }>();
  if (isAdmin) {
    const adminSupabase = createAdminClient();
    const userIds = agencies.map((a) => a.user_id).filter(Boolean) as string[];
    if (userIds.length > 0) {
      // ページネーション付きで全ユーザー取得
      let page = 1;
      const perPage = 50;
      let hasMore = true;
      while (hasMore) {
        const { data } = await adminSupabase.auth.admin.listUsers({
          page,
          perPage,
        });
        if (data?.users) {
          for (const u of data.users) {
            if (userIds.includes(u.id)) {
              authUserMap.set(u.id, {
                email: u.email ?? null,
                last_sign_in_at: u.last_sign_in_at ?? null,
              });
            }
          }
          hasMore = data.users.length === perPage;
        } else {
          hasMore = false;
        }
        page++;
      }
    }
  }

  const agencyMap = new Map(agencies.map((a) => [a.id, a.name]));

  return agencies.map((agency) => {
    const authUser = agency.user_id ? authUserMap.get(agency.user_id) : null;
    return {
      id: agency.id,
      name: agency.name,
      commission_rate: agency.commission_rate,
      rank: agency.rank,
      user_id: agency.user_id,
      email: authUser?.email ?? null,
      created_at: agency.created_at,
      parent_agencies: (hierarchy ?? [])
        .filter((h) => h.agency_id === agency.id)
        .map((h) => ({
          parent_agency_id: h.parent_agency_id,
          parent_name: agencyMap.get(h.parent_agency_id) ?? "",
        })),
      registration_email_sent_at: agency.registration_email_sent_at ?? null,
      last_sign_in_at: authUser?.last_sign_in_at ?? null,
    };
  });
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
  //    メール重複は createUser のエラーで検出（listUsers はページネーション上限あり）
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
    const msg = authError?.message ?? "ユーザー作成に失敗しました";
    if (msg.includes("already been registered")) {
      return { error: "このメールアドレスは既に使用されています" };
    }
    return { error: msg };
  }

  // ロールバック用ヘルパー（adminSupabaseでRLSバイパス）
  async function rollback() {
    const results = await Promise.allSettled([
      adminSupabase.from("agencies").delete().eq("id", agency.id),
      adminSupabase.auth.admin.deleteUser(authData.user!.id),
    ]);
    for (const r of results) {
      if (r.status === "rejected") {
        console.error("[createAgency] rollback failed:", r.reason);
      }
    }
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

  // 7. 上位代理店リスト設定（自身を親に設定する循環参照を防止）
  const safeParentIds = values.parent_agency_ids.filter(
    (pid) => pid !== agency.id
  );
  if (safeParentIds.length > 0) {
    const hierarchyRows = safeParentIds.map((parentId) => ({
      agency_id: agency.id,
      parent_agency_id: parentId,
    }));
    const { error: hierarchyError } = await adminSupabase
      .from("agency_hierarchy")
      .insert(hierarchyRows);

    if (hierarchyError) {
      console.error("[createAgency] agency_hierarchy insert:", hierarchyError.message);
      await rollback();
      return { error: "上位代理店の設定に失敗しました" };
    }

    // 上位代理店のユーザーに閲覧権限を追加
    for (const parentId of safeParentIds) {
      const { data: parentAgency } = await adminSupabase
        .from("agencies")
        .select("user_id")
        .eq("id", parentId)
        .single();

      if (parentAgency?.user_id) {
        const { error: parentViewError } = await adminSupabase
          .from("profile_viewable_agencies")
          .upsert({
            profile_id: parentAgency.user_id,
            agency_id: agency.id,
          });

        if (parentViewError) {
          console.error("[createAgency] parent viewable upsert:", parentViewError.message);
          await rollback();
          return { error: "上位代理店の閲覧権限設定に失敗しました" };
        }
      }
    }
  }

  // 8. メール送信（Resend）
  let emailError: string | null = null;
  try {
    await sendRegistrationEmail(values.email, tempPassword, values.name);
    // メール送信成功を記録
    await adminSupabase
      .from("agencies")
      .update({ registration_email_sent_at: new Date().toISOString() })
      .eq("id", agency.id);
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
  const adminSupabase = createAdminClient();

  // 0. 復元用に旧データを取得
  const [
    { data: oldAgency },
    { data: oldHierarchy },
  ] = await Promise.all([
    supabase
      .from("agencies")
      .select("name, commission_rate, rank")
      .eq("id", agencyId)
      .single(),
    adminSupabase
      .from("agency_hierarchy")
      .select("parent_agency_id")
      .eq("agency_id", agencyId),
  ]);

  if (!oldAgency) {
    return { error: "代理店が見つかりません" };
  }

  // narrowing 後の値をキャプチャ（クロージャ内でnull安全に参照）
  const savedAgency = oldAgency;

  // 復元用ヘルパー: 代理店情報と階層を旧状態に戻す
  async function restoreAgency() {
    const results = await Promise.allSettled([
      adminSupabase
        .from("agencies")
        .update({
          name: savedAgency.name,
          commission_rate: savedAgency.commission_rate,
          rank: savedAgency.rank,
        })
        .eq("id", agencyId),
      restoreHierarchy(),
    ]);
    for (const r of results) {
      if (r.status === "rejected") {
        console.error("[updateAgency] restore failed:", r.reason);
      }
    }
  }

  async function restoreHierarchy() {
    // 現在の階層を削除して旧階層を復元
    await adminSupabase
      .from("agency_hierarchy")
      .delete()
      .eq("agency_id", agencyId);

    if (oldHierarchy && oldHierarchy.length > 0) {
      await adminSupabase
        .from("agency_hierarchy")
        .insert(
          oldHierarchy.map((h) => ({
            agency_id: agencyId,
            parent_agency_id: h.parent_agency_id,
          }))
        );
    }
  }

  // 1. 旧上位代理店リストのユーザーから閲覧権限を削除
  if (oldHierarchy) {
    for (const h of oldHierarchy) {
      const { data: parentAgency } = await adminSupabase
        .from("agencies")
        .select("user_id")
        .eq("id", h.parent_agency_id)
        .single();

      if (parentAgency?.user_id) {
        const { error: delViewError } = await adminSupabase
          .from("profile_viewable_agencies")
          .delete()
          .eq("profile_id", parentAgency.user_id)
          .eq("agency_id", agencyId);

        if (delViewError) {
          console.error("[updateAgency] old viewable delete:", delViewError.message);
          return { error: "旧上位代理店の閲覧権限削除に失敗しました" };
        }
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
  const { error: deleteHierarchyError } = await adminSupabase
    .from("agency_hierarchy")
    .delete()
    .eq("agency_id", agencyId);

  if (deleteHierarchyError) {
    console.error("[updateAgency] hierarchy delete:", deleteHierarchyError.message);
    await restoreAgency();
    return { error: "上位代理店の削除に失敗しました" };
  }

  // 自身を親に設定する循環参照を防止
  const safeParentIds = values.parent_agency_ids.filter(
    (pid) => pid !== agencyId
  );
  if (safeParentIds.length > 0) {
    const hierarchyRows = safeParentIds.map((parentId) => ({
      agency_id: agencyId,
      parent_agency_id: parentId,
    }));
    const { error: hierarchyError } = await adminSupabase
      .from("agency_hierarchy")
      .insert(hierarchyRows);

    if (hierarchyError) {
      console.error("[updateAgency] hierarchy insert:", hierarchyError.message);
      await restoreAgency();
      return { error: "上位代理店の設定に失敗しました" };
    }

    // 新上位代理店のユーザーに閲覧権限を追加
    for (const parentId of safeParentIds) {
      const { data: parentAgency } = await adminSupabase
        .from("agencies")
        .select("user_id")
        .eq("id", parentId)
        .single();

      if (parentAgency?.user_id) {
        const { error: parentViewError } = await adminSupabase
          .from("profile_viewable_agencies")
          .upsert({
            profile_id: parentAgency.user_id,
            agency_id: agencyId,
          });

        if (parentViewError) {
          console.error("[updateAgency] parent viewable upsert:", parentViewError.message);
          await restoreAgency();
          return { error: "上位代理店の閲覧権限設定に失敗しました" };
        }
      }
    }
  }

  revalidatePath("/agencies");
  return { success: true };
}

// ---------------------------------------------------------------------------
// resendRegistrationEmail – 認証メール再送
// ---------------------------------------------------------------------------

export async function resendRegistrationEmail(agencyId: string) {
  const user = await getAuthUser();
  if (!user) return { error: "認証が必要です" };
  if (user.role !== "system_admin") return { error: "権限がありません" };

  const adminSupabase = createAdminClient();

  // 代理店情報取得
  const { data: agency, error: agencyError } = await adminSupabase
    .from("agencies")
    .select("id, name, user_id")
    .eq("id", agencyId)
    .single();

  if (agencyError || !agency) {
    return { error: "代理店が見つかりません" };
  }
  if (!agency.user_id) {
    return { error: "この代理店にはユーザーアカウントが紐付いていません" };
  }

  // Auth ユーザーからメールアドレス取得
  const { data: authUser, error: authError } =
    await adminSupabase.auth.admin.getUserById(agency.user_id);

  if (authError || !authUser?.user?.email) {
    return { error: "ユーザー情報の取得に失敗しました" };
  }

  const email = authUser.user.email;

  // 新しい仮パスワード生成 & Auth パスワード更新
  const tempPassword = generateTempPassword();
  const { error: updateError } = await adminSupabase.auth.admin.updateUserById(
    agency.user_id,
    { password: tempPassword }
  );

  if (updateError) {
    return { error: "パスワードのリセットに失敗しました" };
  }

  // メール送信
  try {
    await sendResendEmail(email, tempPassword, agency.name);
    await adminSupabase
      .from("agencies")
      .update({ registration_email_sent_at: new Date().toISOString() })
      .eq("id", agencyId);
  } catch (e) {
    console.error("[resendRegistrationEmail]", e);
    return { error: "メール送信に失敗しました", tempPassword };
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

// ---------------------------------------------------------------------------
// メールテンプレート
// ---------------------------------------------------------------------------

function buildEmailHtml({
  agencyName,
  email,
  tempPassword,
  loginUrl,
  heading,
  messageLines,
  note,
}: {
  agencyName: string;
  email: string;
  tempPassword: string;
  loginUrl: string;
  heading: string;
  messageLines: string[];
  note: string;
}): string {
  const safeAgencyName = escapeHtml(agencyName);
  const safeEmail = escapeHtml(email);
  const safePassword = escapeHtml(tempPassword);

  const messageParagraphs = messageLines
    .map((line) => `<p style="margin:0 0 8px;color:#374151;font-size:15px;line-height:1.6;">${line}</p>`)
    .join("\n");

  return `
<!DOCTYPE html>
<html lang="ja">
<head><meta charset="UTF-8" /></head>
<body style="margin:0;padding:0;background-color:#f3f4f6;font-family:'Helvetica Neue',Arial,'Hiragino Sans',sans-serif;">
  <div style="max-width:600px;margin:0 auto;padding:24px 16px;">

    <!-- Header -->
    <div style="background-color:#0f172a;border-radius:12px 12px 0 0;padding:24px 32px;">
      <h1 style="margin:0;color:#ffffff;font-size:18px;font-weight:700;letter-spacing:0.5px;">
        KIKIYO LIVE MANAGER
      </h1>
    </div>

    <!-- Body -->
    <div style="background-color:#ffffff;padding:32px;border-left:1px solid #e5e7eb;border-right:1px solid #e5e7eb;">

      <h2 style="margin:0 0 24px;color:#111827;font-size:20px;font-weight:700;">
        ${escapeHtml(heading)}
      </h2>

      <p style="margin:0 0 16px;color:#374151;font-size:15px;line-height:1.6;">
        ${safeAgencyName} 様
      </p>

      ${messageParagraphs}

      <!-- Credentials Card -->
      <div style="background-color:#f8fafc;border:1px solid #e2e8f0;border-radius:8px;padding:20px;margin:24px 0;">
        <table style="width:100%;border-collapse:collapse;">
          <tr>
            <td style="padding:6px 0;color:#64748b;font-size:13px;width:120px;">メールアドレス</td>
            <td style="padding:6px 0;color:#111827;font-size:15px;font-weight:600;">${safeEmail}</td>
          </tr>
          <tr>
            <td style="padding:6px 0;color:#64748b;font-size:13px;">仮パスワード</td>
            <td style="padding:6px 0;color:#111827;font-size:15px;font-weight:600;font-family:'Courier New',monospace;letter-spacing:1px;">${safePassword}</td>
          </tr>
        </table>
      </div>

      <!-- CTA Button -->
      <div style="text-align:center;margin:28px 0;">
        <a href="${escapeHtml(loginUrl)}" style="display:inline-block;background-color:#0f172a;color:#ffffff;text-decoration:none;padding:14px 40px;border-radius:8px;font-size:15px;font-weight:600;">
          ログインする
        </a>
      </div>

      <!-- Steps -->
      <div style="border-top:1px solid #e5e7eb;padding-top:20px;margin-top:20px;">
        <p style="margin:0 0 12px;color:#374151;font-size:14px;font-weight:600;">ログイン手順</p>
        <ol style="margin:0;padding-left:20px;color:#6b7280;font-size:14px;line-height:2;">
          <li>上のボタンをクリックしてログインページを開く</li>
          <li>メールアドレスと仮パスワードを入力</li>
          <li>ログイン後、パスワードを変更してください</li>
        </ol>
      </div>

      <!-- Note -->
      <p style="margin:24px 0 0;padding:12px 16px;background-color:#fefce8;border-left:3px solid #eab308;color:#854d0e;font-size:13px;line-height:1.6;border-radius:0 4px 4px 0;">
        ${escapeHtml(note)}
      </p>

    </div>

    <!-- Footer -->
    <div style="background-color:#f9fafb;border-radius:0 0 12px 12px;padding:16px 32px;border:1px solid #e5e7eb;border-top:none;">
      <p style="margin:0;color:#9ca3af;font-size:12px;text-align:center;">
        &copy; KIKIYO LIVE MANAGER &#8212; このメールは自動送信です
      </p>
    </div>

  </div>
</body>
</html>`;
}

async function sendRegistrationEmail(
  email: string,
  tempPassword: string,
  agencyName: string
) {
  const loginUrl = `${getValidAppUrl()}/login`;

  await sendEmail({
    to: email,
    subject: "【KIKIYO LIVE MANAGER】代理店登録のご案内",
    html: buildEmailHtml({
      agencyName,
      email,
      tempPassword,
      loginUrl,
      heading: "代理店登録のご案内",
      messageLines: [
        "KIKIYO LIVE MANAGERへの代理店登録が完了しました。",
        "以下のログイン情報をご確認のうえ、システムにアクセスしてください。",
      ],
      note: "セキュリティのため、初回ログイン後に必ずパスワードを変更してください。仮パスワードは他の方に共有しないでください。",
    }),
  });
}

async function sendResendEmail(
  email: string,
  tempPassword: string,
  agencyName: string
) {
  const loginUrl = `${getValidAppUrl()}/login`;

  await sendEmail({
    to: email,
    subject: "【KIKIYO LIVE MANAGER】ログイン情報の再送",
    html: buildEmailHtml({
      agencyName,
      email,
      tempPassword,
      loginUrl,
      heading: "ログイン情報の再送",
      messageLines: [
        "ログイン情報を再送いたします。以前のパスワードはリセットされました。",
        "以下の新しいログイン情報をご利用ください。",
      ],
      note: "以前のパスワードは無効になっています。必ず以下の新しい仮パスワードをご使用ください。",
    }),
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
