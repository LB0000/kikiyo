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
import { sendEmail, escapeHtml, getValidAppUrl, wrapEmailLayout } from "@/lib/email";

export type AgencyWithHierarchy = {
  id: string;
  name: string;
  /** 請求書宛名用の会社名。空の場合は name を代替使用 */
  company_name: string | null;
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
      .select("id, name, company_name, commission_rate, rank, user_id, created_at, registration_email_sent_at")
      .eq("is_deleted", false)
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

  // hierarchy を agency_id でインデックス化（O(n) 化）
  const hierarchyByAgency = new Map<string, { parent_agency_id: string }[]>();
  for (const h of hierarchy ?? []) {
    const list = hierarchyByAgency.get(h.agency_id);
    if (list) {
      list.push(h);
    } else {
      hierarchyByAgency.set(h.agency_id, [h]);
    }
  }

  return agencies.map((agency) => {
    const authUser = agency.user_id ? authUserMap.get(agency.user_id) : null;
    return {
      id: agency.id,
      name: agency.name,
      company_name: agency.company_name ?? null,
      commission_rate: agency.commission_rate,
      rank: agency.rank,
      user_id: agency.user_id,
      email: authUser?.email ?? null,
      created_at: agency.created_at,
      parent_agencies: (hierarchyByAgency.get(agency.id) ?? []).map((h) => ({
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
    if (agencyError) console.error("[createAgency] agencies insert:", agencyError.message);
    return { error: "代理店の作成に失敗しました" };
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
    const msg = authError?.message ?? "";
    if (msg.includes("already been registered")) {
      return { error: "このメールアドレスは既に使用されています" };
    }
    console.error("[createAgency] auth.admin.createUser:", msg);
    return { error: "ユーザー作成に失敗しました" };
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

    // 上位代理店のユーザーに閲覧権限を一括追加
    const { data: parentAgencies } = await adminSupabase
      .from("agencies")
      .select("user_id")
      .in("id", safeParentIds);

    const viewableRows = (parentAgencies ?? [])
      .filter((p) => p.user_id)
      .map((p) => ({ profile_id: p.user_id!, agency_id: agency.id }));

    if (viewableRows.length > 0) {
      const { error: parentViewError } = await adminSupabase
        .from("profile_viewable_agencies")
        .upsert(viewableRows);

      if (parentViewError) {
        console.error("[createAgency] parent viewable upsert:", parentViewError.message);
        await rollback();
        return { error: "上位代理店の閲覧権限設定に失敗しました" };
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

  // 1. 旧上位代理店リストのユーザーから閲覧権限を一括削除
  if (oldHierarchy && oldHierarchy.length > 0) {
    const oldParentIds = oldHierarchy.map((h) => h.parent_agency_id);
    const { data: oldParentAgencies } = await adminSupabase
      .from("agencies")
      .select("user_id")
      .in("id", oldParentIds);

    const userIdsToRemove = (oldParentAgencies ?? [])
      .filter((p) => p.user_id)
      .map((p) => p.user_id!);

    if (userIdsToRemove.length > 0) {
      const { error: delViewError } = await adminSupabase
        .from("profile_viewable_agencies")
        .delete()
        .in("profile_id", userIdsToRemove)
        .eq("agency_id", agencyId);

      if (delViewError) {
        console.error("[updateAgency] old viewable delete:", delViewError.message);
        return { error: "旧上位代理店の閲覧権限削除に失敗しました" };
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
    console.error("[updateAgency] agencies update:", error.message);
    return { error: "代理店情報の更新に失敗しました" };
  }

  // 2.5. 手数料率が変更された場合、csv_data.agency_reward_jpy を再計算
  const commissionChanged = values.commission_rate !== Number(savedAgency.commission_rate);
  if (commissionChanged) {
    const { error: rpcError } = await supabase.rpc("update_commission_rate", {
      p_agency_id: agencyId,
      p_new_commission_rate: values.commission_rate,
    });
    if (rpcError) {
      console.error("[updateAgency] update_commission_rate:", rpcError.message);
      await restoreAgency();
      return { error: "手数料率の更新に失敗しました。再度お試しください。" };
    }
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

    // 新上位代理店のユーザーに閲覧権限を一括追加
    const { data: parentAgencies } = await adminSupabase
      .from("agencies")
      .select("user_id")
      .in("id", safeParentIds);

    const viewableRows = (parentAgencies ?? [])
      .filter((p) => p.user_id)
      .map((p) => ({ profile_id: p.user_id!, agency_id: agencyId }));

    if (viewableRows.length > 0) {
      const { error: parentViewError } = await adminSupabase
        .from("profile_viewable_agencies")
        .upsert(viewableRows);

      if (parentViewError) {
        console.error("[updateAgency] parent viewable upsert:", parentViewError.message);
        await restoreAgency();
        return { error: "上位代理店の閲覧権限設定に失敗しました" };
      }
    }
  }

  revalidatePath("/agencies");
  if (commissionChanged) {
    revalidatePath("/dashboard");
  }
  return { success: true, commissionRecalculated: commissionChanged };
}

// ---------------------------------------------------------------------------
// updateAgencyEmail – メールアドレス変更
// ---------------------------------------------------------------------------

export async function updateAgencyEmail(
  agencyId: string,
  newEmail: string
): Promise<{ success: true; emailError?: string | null } | { error: string }> {
  const user = await getAuthUser();
  if (!user) return { error: "認証が必要です" };
  if (user.role !== "system_admin") return { error: "権限がありません" };

  // バリデーション
  const emailParsed = agencyFormSchema.shape.email.safeParse(newEmail);
  if (!emailParsed.success) {
    return { error: emailParsed.error.issues[0]?.message ?? "有効なメールアドレスを入力してください" };
  }

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

  // 現在のメールアドレス取得
  const { data: authUser, error: authError } =
    await adminSupabase.auth.admin.getUserById(agency.user_id);

  if (authError || !authUser?.user) {
    return { error: "ユーザー情報の取得に失敗しました" };
  }

  // 変更なしなら早期リターン
  if (authUser.user.email === newEmail) {
    return { success: true };
  }

  // 仮パスワード生成
  const tempPassword = generateTempPassword();

  // Auth ユーザー更新（メール + パスワード）
  const { error: updateError } = await adminSupabase.auth.admin.updateUserById(
    agency.user_id,
    { email: newEmail, password: tempPassword }
  );

  if (updateError) {
    const msg = updateError.message ?? "";
    if (msg.includes("already been registered")) {
      return { error: "このメールアドレスは既に使用されています" };
    }
    console.error("[updateAgencyEmail] updateUserById:", msg);
    return { error: "メールアドレスの変更に失敗しました" };
  }

  // 新しいメールアドレスに登録案内メール送信
  let emailError: string | null = null;
  try {
    await sendRegistrationEmail(newEmail, tempPassword, agency.name);
    await adminSupabase
      .from("agencies")
      .update({ registration_email_sent_at: new Date().toISOString() })
      .eq("id", agencyId);
  } catch (e) {
    emailError = e instanceof Error ? e.message : "メール送信に失敗しました";
    console.error("[updateAgencyEmail] sendEmail:", emailError);
  }

  revalidatePath("/agencies");
  return { success: true, emailError };
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
  for (let i = 0; i < 14; i++) {
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

function buildRegistrationEmailBody({
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

  return wrapEmailLayout(`
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
  `);
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
    html: buildRegistrationEmailBody({
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
    html: buildRegistrationEmailBody({
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
// deleteAgency (論理削除)
// ---------------------------------------------------------------------------

export async function deleteAgency(
  agencyId: string
): Promise<{ success: true } | { error: string }> {
  const user = await getAuthUser();
  if (!user) return { error: "認証が必要です" };
  if (user.role !== "system_admin") return { error: "権限がありません" };

  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  if (!uuidRegex.test(agencyId)) return { error: "無効な代理店IDです" };

  const adminSupabase = createAdminClient();

  // 代理店の存在確認
  const { data: agency, error: agencyError } = await adminSupabase
    .from("agencies")
    .select("id, name, user_id, is_deleted")
    .eq("id", agencyId)
    .single();

  if (agencyError || !agency) {
    return { error: "代理店が見つかりません" };
  }

  if (agency.is_deleted) {
    return { error: "この代理店は既に削除されています" };
  }

  // 論理削除
  const { error } = await adminSupabase
    .from("agencies")
    .update({ is_deleted: true })
    .eq("id", agencyId);

  if (error) {
    console.error("[deleteAgency]", error.message);
    return { error: "代理店の削除に失敗しました" };
  }

  // Authユーザー無効化 + 閲覧権限クリア（失敗してもis_deleted済みなので続行）
  if (agency.user_id) {
    const [banResult, viewResult] = await Promise.allSettled([
      adminSupabase.auth.admin.updateUserById(agency.user_id, {
        ban_duration: "876600h",
      }),
      adminSupabase
        .from("profile_viewable_agencies")
        .delete()
        .eq("profile_id", agency.user_id),
    ]);
    if (banResult.status === "rejected") {
      console.warn("[deleteAgency] auth ban failed:", banResult.reason);
    }
    if (viewResult.status === "rejected") {
      console.warn("[deleteAgency] viewable cleanup failed:", viewResult.reason);
    }
  }

  revalidatePath("/agencies");
  return { success: true };
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
      "id, name, company_name, contract_person_name, invoice_registration_number, company_address, representative_name, bank_name, bank_branch, bank_account_type, bank_account_number, bank_account_holder"
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
      company_name: v.company_name || null,
      contract_person_name: v.contract_person_name || null,
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
    console.error("[updateAgencyCompanyInfo] agencies update:", error.message);
    return { error: "会社情報の更新に失敗しました" };
  }

  revalidatePath("/agencies");
  return { success: true };
}
