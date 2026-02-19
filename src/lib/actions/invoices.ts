"use server";

import { createClient, createAdminClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { getAuthUser } from "@/lib/auth";
import { createInvoiceSchema } from "@/lib/validations/invoice";
import { CONSUMPTION_TAX_RATE } from "@/lib/constants";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type InvoiceListItem = {
  id: string;
  invoice_number: string;
  agency_name: string;
  agency_id: string;
  data_month: string | null;
  total_jpy: number;
  subtotal_jpy: number;
  tax_amount_jpy: number;
  is_invoice_registered: boolean;
  sent_at: string | null;
  created_at: string;
};

export type InvoiceDetail = {
  id: string;
  invoice_number: string;
  agency_id: string;
  monthly_report_id: string;
  subtotal_jpy: number;
  tax_rate: number;
  tax_amount_jpy: number;
  total_jpy: number;
  is_invoice_registered: boolean;
  invoice_registration_number: string | null;
  deductible_rate: number;
  agency_name: string;
  agency_address: string | null;
  agency_representative: string | null;
  bank_name: string | null;
  bank_branch: string | null;
  bank_account_type: string | null;
  bank_account_number: string | null;
  bank_account_holder: string | null;
  data_month: string | null;
  exchange_rate: number;
  commission_rate: number;
  sent_at: string | null;
  created_by: string;
  created_at: string;
};

export type InvoicePreview = {
  agencyName: string;
  agencyAddress: string | null;
  agencyRepresentative: string | null;
  invoiceRegistrationNumber: string | null;
  isInvoiceRegistered: boolean;
  bankName: string | null;
  bankBranch: string | null;
  bankAccountType: string | null;
  bankAccountNumber: string | null;
  bankAccountHolder: string | null;
  dataMonth: string | null;
  exchangeRate: number;
  commissionRate: number;
  subtotalJpy: number;
  taxAmountJpy: number;
  totalJpy: number;
  deductibleRate: number;
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function getDeductibleRate(
  isRegistered: boolean,
  referenceDate: Date = new Date()
): number {
  if (isRegistered) return 1.0;
  if (referenceDate < new Date("2026-10-01")) return 0.8;
  if (referenceDate < new Date("2029-10-01")) return 0.5;
  return 0.0;
}

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function getValidAppUrl(): string {
  const rawUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
  try {
    const parsed = new URL(rawUrl);
    if (parsed.protocol !== "https:" && parsed.protocol !== "http:") {
      return "http://localhost:3000";
    }
    return parsed.origin;
  } catch {
    return "http://localhost:3000";
  }
}

// ---------------------------------------------------------------------------
// 1. getInvoices
// ---------------------------------------------------------------------------

export async function getInvoices(
  agencyId?: string
): Promise<InvoiceListItem[]> {
  const user = await getAuthUser();
  if (!user) return [];

  const supabase = await createClient();

  let query = supabase
    .from("invoices")
    .select(
      "id, invoice_number, agency_name, agency_id, data_month, total_jpy, subtotal_jpy, tax_amount_jpy, is_invoice_registered, sent_at, created_at"
    )
    .order("created_at", { ascending: false });

  if (agencyId) {
    query = query.eq("agency_id", agencyId);
  }

  const { data, error } = await query;

  if (error || !data) return [];

  return data;
}

// ---------------------------------------------------------------------------
// 2. getInvoiceDetail
// ---------------------------------------------------------------------------

export async function getInvoiceDetail(
  invoiceId: string
): Promise<InvoiceDetail | { error: string }> {
  const user = await getAuthUser();
  if (!user) return { error: "認証が必要です" };

  const supabase = await createClient();

  const { data, error } = await supabase
    .from("invoices")
    .select(
      "id, invoice_number, agency_id, monthly_report_id, subtotal_jpy, tax_rate, tax_amount_jpy, total_jpy, is_invoice_registered, invoice_registration_number, deductible_rate, agency_name, agency_address, agency_representative, bank_name, bank_branch, bank_account_type, bank_account_number, bank_account_holder, data_month, exchange_rate, commission_rate, sent_at, created_by, created_at"
    )
    .eq("id", invoiceId)
    .single();

  if (error || !data) {
    return { error: error?.message ?? "請求書が見つかりません" };
  }

  return data;
}

// ---------------------------------------------------------------------------
// 3. getInvoicePreview
// ---------------------------------------------------------------------------

export async function getInvoicePreview(
  agencyId: string,
  monthlyReportId: string
): Promise<InvoicePreview | { error: string }> {
  const user = await getAuthUser();
  if (!user) return { error: "認証が必要です" };
  if (user.role !== "agency_user") {
    return { error: "代理店ユーザーのみプレビューを取得できます" };
  }

  const supabase = await createClient();
  const adminSupabase = createAdminClient();

  // 代理店情報と月次レポートを並列取得
  const [agencyRes, reportRes] = await Promise.all([
    supabase
      .from("agencies")
      .select(
        "name, commission_rate, invoice_registration_number, company_address, representative_name, bank_name, bank_branch, bank_account_type, bank_account_number, bank_account_holder"
      )
      .eq("id", agencyId)
      .single(),
    supabase
      .from("monthly_reports")
      .select("rate, data_month")
      .eq("id", monthlyReportId)
      .single(),
  ]);

  if (agencyRes.error || !agencyRes.data) {
    return {
      error: agencyRes.error?.message ?? "代理店が見つかりません",
    };
  }

  if (reportRes.error || !reportRes.data) {
    return {
      error: reportRes.error?.message ?? "月次レポートが見つかりません",
    };
  }

  const agency = agencyRes.data;
  const report = reportRes.data;

  // csv_data から agency_reward_jpy の合計を算出（adminSupabase でRLSバイパス）
  const { data: csvRows, error: csvError } = await adminSupabase
    .from("csv_data")
    .select("agency_reward_jpy")
    .eq("agency_id", agencyId)
    .eq("monthly_report_id", monthlyReportId);

  if (csvError) {
    return { error: csvError.message };
  }

  const subtotalJpy = (csvRows ?? []).reduce(
    (sum, row) => sum + (row.agency_reward_jpy ?? 0),
    0
  );
  const taxAmountJpy = Math.round(subtotalJpy * CONSUMPTION_TAX_RATE);
  const totalJpy = subtotalJpy + taxAmountJpy;

  const isInvoiceRegistered = !!agency.invoice_registration_number;
  const deductibleRate = getDeductibleRate(isInvoiceRegistered);

  return {
    agencyName: agency.name,
    agencyAddress: agency.company_address,
    agencyRepresentative: agency.representative_name,
    invoiceRegistrationNumber: agency.invoice_registration_number,
    isInvoiceRegistered,
    bankName: agency.bank_name,
    bankBranch: agency.bank_branch,
    bankAccountType: agency.bank_account_type,
    bankAccountNumber: agency.bank_account_number,
    bankAccountHolder: agency.bank_account_holder,
    dataMonth: report.data_month,
    exchangeRate: report.rate,
    commissionRate: agency.commission_rate,
    subtotalJpy,
    taxAmountJpy,
    totalJpy,
    deductibleRate,
  };
}

// ---------------------------------------------------------------------------
// 4. createAndSendInvoice
// ---------------------------------------------------------------------------

export async function createAndSendInvoice(params: {
  agencyId: string;
  monthlyReportId: string;
}): Promise<{ success: true; invoiceId: string } | { error: string }> {
  const user = await getAuthUser();
  if (!user) return { error: "認証が必要です" };

  // Zodバリデーション
  const parsed = createInvoiceSchema.safeParse(params);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "入力値が不正です" };
  }

  const { agencyId, monthlyReportId } = parsed.data;
  const supabase = await createClient();
  const adminSupabase = createAdminClient();

  // 請求書作成は代理店ユーザーのみ
  if (user.role !== "agency_user") {
    return { error: "代理店ユーザーのみ請求書を作成できます" };
  }

  // 閲覧可能代理店のみ許可
  const { data: viewable } = await supabase
    .from("profile_viewable_agencies")
    .select("agency_id")
    .eq("profile_id", user.id);

  const viewableIds = (viewable ?? []).map((v) => v.agency_id);
  if (!viewableIds.includes(agencyId)) {
    return { error: "権限がありません" };
  }

  // 代理店情報・月次レポートを並列取得
  const [agencyRes, reportRes] = await Promise.all([
    supabase
      .from("agencies")
      .select(
        "name, commission_rate, invoice_registration_number, company_address, representative_name, bank_name, bank_branch, bank_account_type, bank_account_number, bank_account_holder"
      )
      .eq("id", agencyId)
      .single(),
    supabase
      .from("monthly_reports")
      .select("rate, data_month")
      .eq("id", monthlyReportId)
      .single(),
  ]);

  if (agencyRes.error || !agencyRes.data) {
    return {
      error: agencyRes.error?.message ?? "代理店が見つかりません",
    };
  }

  if (reportRes.error || !reportRes.data) {
    return {
      error: reportRes.error?.message ?? "月次レポートが見つかりません",
    };
  }

  const agency = agencyRes.data;
  const report = reportRes.data;

  // csv_data から agency_reward_jpy の合計を算出（adminSupabase でRLSバイパス）
  const { data: csvRows, error: csvError } = await adminSupabase
    .from("csv_data")
    .select("agency_reward_jpy")
    .eq("agency_id", agencyId)
    .eq("monthly_report_id", monthlyReportId);

  if (csvError) {
    return { error: csvError.message };
  }

  // 同一代理店+レポートの重複チェック
  const { data: existingDuplicate } = await adminSupabase
    .from("invoices")
    .select("id")
    .eq("agency_id", agencyId)
    .eq("monthly_report_id", monthlyReportId)
    .limit(1);

  if (existingDuplicate && existingDuplicate.length > 0) {
    return { error: "この代理店・月次レポートの請求書は既に作成済みです" };
  }

  const subtotalJpy = (csvRows ?? []).reduce(
    (sum, row) => sum + (row.agency_reward_jpy ?? 0),
    0
  );
  const taxAmountJpy = Math.round(subtotalJpy * CONSUMPTION_TAX_RATE);
  const totalJpy = subtotalJpy + taxAmountJpy;

  const isInvoiceRegistered = !!agency.invoice_registration_number;
  const deductibleRate = getDeductibleRate(isInvoiceRegistered);

  // 請求書番号の生成: INV-{YYYYMM}-{4桁連番}
  const dataMonth = report.data_month;
  const cleanedMonth = dataMonth
    ? dataMonth.replace(/[^0-9]/g, "").slice(0, 6)
    : "";
  const monthPrefix = cleanedMonth.length >= 4
    ? cleanedMonth
    : new Date().toISOString().slice(0, 7).replace("-", "");

  const invoicePrefix = `INV-${monthPrefix}-`;

  // 請求書番号生成＋挿入（競合時リトライ）
  const MAX_RETRIES = 3;
  let invoice: { id: string; invoice_number: string } | null = null;
  let lastInsertError: string | null = null;

  for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
    // 既存の請求書から最大連番を取得
    const { data: existingInvoices } = await adminSupabase
      .from("invoices")
      .select("invoice_number")
      .like("invoice_number", `${invoicePrefix}%`)
      .order("invoice_number", { ascending: false })
      .limit(1);

    let seq = 1;
    if (existingInvoices && existingInvoices.length > 0) {
      const lastNumber = existingInvoices[0].invoice_number;
      const lastSeq = parseInt(lastNumber.replace(invoicePrefix, ""), 10);
      if (!isNaN(lastSeq)) {
        seq = lastSeq + 1;
      }
    }

    const invoiceNumber = `${invoicePrefix}${String(seq).padStart(4, "0")}`;

    // 請求書レコード作成
    const { data, error: insertError } = await adminSupabase
      .from("invoices")
      .insert({
        invoice_number: invoiceNumber,
        agency_id: agencyId,
        monthly_report_id: monthlyReportId,
        subtotal_jpy: subtotalJpy,
        tax_rate: CONSUMPTION_TAX_RATE,
        tax_amount_jpy: taxAmountJpy,
        total_jpy: totalJpy,
        is_invoice_registered: isInvoiceRegistered,
        invoice_registration_number: agency.invoice_registration_number,
        deductible_rate: deductibleRate,
        agency_name: agency.name,
        agency_address: agency.company_address,
        agency_representative: agency.representative_name,
        bank_name: agency.bank_name,
        bank_branch: agency.bank_branch,
        bank_account_type: agency.bank_account_type,
        bank_account_number: agency.bank_account_number,
        bank_account_holder: agency.bank_account_holder,
        data_month: dataMonth,
        exchange_rate: report.rate,
        commission_rate: agency.commission_rate,
        sent_at: new Date().toISOString(),
        created_by: user.id,
      })
      .select("id, invoice_number")
      .single();

    if (!insertError && data) {
      invoice = data;
      break;
    }

    // UNIQUE制約違反の場合はリトライ
    lastInsertError = insertError?.message ?? "請求書の作成に失敗しました";
    if (!insertError?.message?.includes("unique") && !insertError?.message?.includes("duplicate")) {
      break;
    }
  }

  if (!invoice) {
    return { error: lastInsertError ?? "請求書の作成に失敗しました" };
  }

  // メール通知送信（失敗しても請求書作成は成功）
  try {
    await sendInvoiceNotificationEmail({
      agencyName: agency.name,
      invoiceNumber: invoice.invoice_number,
      totalJpy,
      dataMonth,
    });
  } catch {
    // メール送信失敗しても請求書作成は成功
  }

  revalidatePath("/invoices");
  return { success: true, invoiceId: invoice.id };
}

// ---------------------------------------------------------------------------
// Email notification
// ---------------------------------------------------------------------------

async function sendInvoiceNotificationEmail(params: {
  agencyName: string;
  invoiceNumber: string;
  totalJpy: number;
  dataMonth: string | null;
}) {
  const { agencyName, invoiceNumber, totalJpy, dataMonth } = params;
  const appUrl = getValidAppUrl();

  const adminEmail =
    process.env.ADMIN_EMAIL ?? process.env.EMAIL_FROM ?? "noreply@resend.dev";
  const safeAgencyName = escapeHtml(agencyName);
  const safeInvoiceNumber = escapeHtml(invoiceNumber);
  const formattedTotal = totalJpy.toLocaleString("ja-JP");
  const safeDataMonth = dataMonth ? escapeHtml(dataMonth) : "未指定";

  const subject = `請求書送付通知: ${agencyName} (${dataMonth ?? "未指定"})`;

  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
    },
    body: JSON.stringify({
      from: process.env.EMAIL_FROM ?? "TikTok Live Tool <noreply@resend.dev>",
      to: [adminEmail],
      subject,
      html: `
        <h2>請求書送付通知</h2>
        <p>以下の請求書が作成・送付されました。</p>
        <ul>
          <li><strong>代理店名:</strong> ${safeAgencyName}</li>
          <li><strong>請求書番号:</strong> ${safeInvoiceNumber}</li>
          <li><strong>対象月:</strong> ${safeDataMonth}</li>
          <li><strong>合計金額:</strong> ${formattedTotal}円（税込）</li>
        </ul>
        <p><a href="${appUrl}/invoices">請求書一覧を確認する</a></p>
      `,
    }),
  });

  if (!res.ok) {
    throw new Error("メール送信に失敗しました");
  }
}
