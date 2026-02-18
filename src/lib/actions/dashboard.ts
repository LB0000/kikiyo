"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { getAuthUser } from "@/lib/auth";
import type { RevenueTask } from "@/lib/supabase/types";
import { TAX_RATE } from "@/lib/constants";
import { createRefundSchema } from "@/lib/validations/refund";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

// Bubble ↔ Next.js ボーナスフィールド対応表:
//   Bubble task1  → bonus_rookie_half_milestone (Bonus - Rookie Half Milestone)
//   Bubble task2  → bonus_activeness            (Bonus - Activeness)
//   Bubble task3  → bonus_revenue_scale         (Bonus - Revenue Scale)
//   Bubble task4  → bonus_rookie_milestone_1    (Bonus - Rookie Milestone 1)
//   Bubble task5  → bonus_rookie_milestone_2    (Bonus - Rookie Milestone 2)
//   Bubble task6+ → bonus_off_platform          (Bonus - Off Platform)
//   (Bubbleなし)  → bonus_rookie_retention      (Bonus - Rookie Retention)
export type CsvRow = {
  creator_id: string;
  creator_nickname: string;
  handle: string;
  group: string;
  group_manager: string;
  creator_network_manager: string;
  data_month: string;
  diamonds: number;
  estimated_bonus: number;
  valid_days: string;
  live_duration: string;
  is_violative_creators: boolean;
  the_creator_was_rookie_at_the_time_of_first_joining: boolean;
  bonus_rookie_half_milestone: number;
  bonus_activeness: number;
  bonus_revenue_scale: number;
  bonus_rookie_milestone_1: number;
  bonus_rookie_milestone_2: number;
  bonus_off_platform: number;
  bonus_rookie_retention: number;
};

export type MonthlyReportItem = {
  id: string;
  rate: number;
  revenue_task: RevenueTask | null;
  created_at: string;
};

export type DashboardSummary = {
  totalDiamonds: number;
  totalBonus: number;
  totalRewardJpy: number;
  totalAgencyRewardJpy: number;
  totalRefundJpy: number;
  taxRate: number;
  netAmountExTax: number;
  netAmountIncTax: number;
  agencyPaymentIncTax: number;
  commissionRate: number;
};

export type DashboardData = {
  report: MonthlyReportItem;
  csvRows: Array<{
    id: string;
    creator_id: string | null;
    creator_nickname: string | null;
    handle: string | null;
    group: string | null;
    group_manager: string | null;
    creator_network_manager: string | null;
    data_month: string | null;
    diamonds: number;
    estimated_bonus: number;
    bonus_rookie_half_milestone: number;
    bonus_activeness: number;
    bonus_revenue_scale: number;
    bonus_rookie_milestone_1: number;
    bonus_rookie_milestone_2: number;
    bonus_off_platform: number;
    bonus_rookie_retention: number;
    valid_days: string | null;
    live_duration: string | null;
    is_violative: boolean;
    was_rookie: boolean;
    total_reward_jpy: number;
    agency_reward_jpy: number;
    liver_id: string | null;
    agency_id: string | null;
    monthly_report_id: string | null;
    upload_agency_id: string | null;
    created_at: string;
  }>;
  refunds: Array<{
    id: string;
    target_month: string;
    reason: string | null;
    amount_usd: number;
    amount_jpy: number;
    is_deleted: boolean;
    agency_id: string | null;
    liver_id: string | null;
    monthly_report_id: string | null;
    created_at: string;
  }>;
  summary: DashboardSummary;
};

// ---------------------------------------------------------------------------
// 1. getMonthlyReports
// ---------------------------------------------------------------------------

export async function getMonthlyReports(): Promise<MonthlyReportItem[]> {
  const user = await getAuthUser();
  if (!user) return [];

  const supabase = await createClient();

  const { data, error } = await supabase
    .from("monthly_reports")
    .select("id, rate, revenue_task, created_at")
    .order("created_at", { ascending: false });

  if (error || !data) return [];

  return data;
}

// ---------------------------------------------------------------------------
// 2. getDashboardData
// ---------------------------------------------------------------------------

export async function getDashboardData(
  monthlyReportId: string,
  agencyId?: string
): Promise<DashboardData | { error: string }> {
  const user = await getAuthUser();
  if (!user) return { error: "認証が必要です" };

  const supabase = await createClient();

  // Fetch the monthly report
  const { data: report, error: reportError } = await supabase
    .from("monthly_reports")
    .select("id, rate, revenue_task, created_at")
    .eq("id", monthlyReportId)
    .single();

  if (reportError || !report) {
    return { error: reportError?.message ?? "月次レポートが見つかりません" };
  }

  // csv_data と refunds を並列取得
  let csvQuery = supabase
    .from("csv_data")
    .select("*")
    .eq("monthly_report_id", monthlyReportId);

  if (agencyId) {
    csvQuery = csvQuery.eq("agency_id", agencyId);
  }

  let refundQuery = supabase
    .from("refunds")
    .select("*")
    .eq("monthly_report_id", monthlyReportId)
    .eq("is_deleted", false);

  if (agencyId) {
    refundQuery = refundQuery.eq("agency_id", agencyId);
  }

  const [
    { data: csvRows, error: csvError },
    { data: refunds, error: refundError },
  ] = await Promise.all([csvQuery, refundQuery]);

  if (csvError) {
    return { error: csvError.message };
  }

  if (refundError) {
    return { error: refundError.message };
  }

  const rows = csvRows ?? [];
  const refundRows = refunds ?? [];

  // Compute summary
  const totalDiamonds = rows.reduce((sum, r) => sum + r.diamonds, 0);
  const totalBonus = rows.reduce((sum, r) => sum + r.estimated_bonus, 0);
  const totalRewardJpy = rows.reduce((sum, r) => sum + r.total_reward_jpy, 0);
  const totalAgencyRewardJpy = rows.reduce(
    (sum, r) => sum + r.agency_reward_jpy,
    0
  );
  const totalRefundJpy = refundRows.reduce(
    (sum, r) => sum + r.amount_jpy,
    0
  );

  // Derive a representative commission rate from the rows
  // If there are agency reward rows, calculate the effective commission rate
  const commissionRate =
    totalRewardJpy > 0 ? totalAgencyRewardJpy / totalRewardJpy : 0;

  const netAmountExTax = totalRewardJpy - totalRefundJpy;
  const netAmountIncTax = netAmountExTax * TAX_RATE;
  const agencyPaymentIncTax = totalAgencyRewardJpy * TAX_RATE;

  const summary: DashboardSummary = {
    totalDiamonds,
    totalBonus,
    totalRewardJpy,
    totalAgencyRewardJpy,
    totalRefundJpy,
    taxRate: TAX_RATE,
    netAmountExTax,
    netAmountIncTax,
    agencyPaymentIncTax,
    commissionRate,
  };

  return {
    report,
    csvRows: rows,
    refunds: refundRows,
    summary,
  };
}

// ---------------------------------------------------------------------------
// 3. importCsvData
// ---------------------------------------------------------------------------

export type ImportResult = {
  success: true;
  monthlyReportId: string;
  totalRows: number;
  linkedLiverCount: number;
  unlinkedLiverCount: number;
  linkedAgencyCount: number;
  unlinkedAgencyCount: number;
};

export async function importCsvData(params: {
  rows: CsvRow[];
  rate: number;
  revenueTask: RevenueTask;
  uploadAgencyId: string;
}): Promise<ImportResult | { error: string }> {
  const user = await getAuthUser();
  if (!user) return { error: "認証が必要です" };

  const { rows, rate, revenueTask, uploadAgencyId } = params;

  if (rows.length === 0) return { error: "CSVデータが空です" };
  if (rows.length > 10000) return { error: "CSVデータが多すぎます（上限10,000行）" };
  if (rate < 50 || rate > 500) return { error: "為替レートは50〜500の範囲で入力してください" };
  if (!uploadAgencyId) return { error: "アップロード代理店が指定されていません" };

  const supabase = await createClient();

  // agency_userは閲覧可能代理店のみ許可
  if (user.role !== "system_admin") {
    const { data: viewable } = await supabase
      .from("profile_viewable_agencies")
      .select("agency_id")
      .eq("profile_id", user.id);

    const viewableIds = (viewable ?? []).map((v) => v.agency_id);
    if (!viewableIds.includes(uploadAgencyId)) {
      return { error: "権限がありません" };
    }
  }

  // 1. Create the monthly_report
  const { data: report, error: reportError } = await supabase
    .from("monthly_reports")
    .insert({
      rate,
      revenue_task: revenueTask,
    })
    .select()
    .single();

  if (reportError || !report) {
    return {
      error: reportError?.message ?? "月次レポートの作成に失敗しました",
    };
  }

  // 2. Pre-fetch all livers and agencies for lookups
  const { data: allLivers } = await supabase
    .from("livers")
    .select("id, liver_id, agency_id");

  const { data: allAgencies } = await supabase
    .from("agencies")
    .select("id, name, commission_rate");

  const liverMap = new Map(
    (allLivers ?? [])
      .filter((l) => l.liver_id !== null)
      .map((l) => [l.liver_id!, l])
  );

  const agencyByNameMap = new Map(
    (allAgencies ?? []).map((a) => [a.name, a])
  );

  // 3. Build csv_data insert rows
  const insertRows = rows.map((row) => {
    const liver = liverMap.get(row.creator_id);
    const agency = agencyByNameMap.get(row.creator_network_manager);

    const totalRewardJpy = row.estimated_bonus * rate;
    const agencyCommissionRate = agency?.commission_rate ?? 0;
    const agencyRewardJpy = row.estimated_bonus * rate * agencyCommissionRate;

    return {
      creator_id: row.creator_id,
      creator_nickname: row.creator_nickname,
      handle: row.handle,
      group: row.group,
      group_manager: row.group_manager,
      creator_network_manager: row.creator_network_manager,
      data_month: row.data_month,
      diamonds: row.diamonds,
      estimated_bonus: row.estimated_bonus,
      bonus_rookie_half_milestone: row.bonus_rookie_half_milestone,
      bonus_activeness: row.bonus_activeness,
      bonus_revenue_scale: row.bonus_revenue_scale,
      bonus_rookie_milestone_1: row.bonus_rookie_milestone_1,
      bonus_rookie_milestone_2: row.bonus_rookie_milestone_2,
      bonus_off_platform: row.bonus_off_platform,
      bonus_rookie_retention: row.bonus_rookie_retention,
      valid_days: row.valid_days,
      live_duration: row.live_duration,
      is_violative: row.is_violative_creators,
      was_rookie: row.the_creator_was_rookie_at_the_time_of_first_joining,
      total_reward_jpy: totalRewardJpy,
      agency_reward_jpy: agencyRewardJpy,
      liver_id: liver?.id ?? null,
      agency_id: agency?.id ?? null,
      monthly_report_id: report.id,
      upload_agency_id: uploadAgencyId,
    };
  });

  // 4. Count link statistics
  const linkedLiverCount = insertRows.filter((r) => r.liver_id !== null).length;
  const unlinkedLiverCount = insertRows.length - linkedLiverCount;
  const linkedAgencyCount = insertRows.filter((r) => r.agency_id !== null).length;
  const unlinkedAgencyCount = insertRows.length - linkedAgencyCount;

  // 5. Insert csv_data in batches (Supabase has row limits per insert)
  const BATCH_SIZE = 500;
  for (let i = 0; i < insertRows.length; i += BATCH_SIZE) {
    const batch = insertRows.slice(i, i + BATCH_SIZE);
    const { error: insertError } = await supabase
      .from("csv_data")
      .insert(batch);

    if (insertError) {
      // Cleanup: remove partial csv_data and orphaned monthly_report
      await supabase
        .from("csv_data")
        .delete()
        .eq("monthly_report_id", report.id);
      await supabase
        .from("monthly_reports")
        .delete()
        .eq("id", report.id);
      return { error: insertError.message };
    }
  }

  revalidatePath("/dashboard");
  return {
    success: true,
    monthlyReportId: report.id,
    totalRows: insertRows.length,
    linkedLiverCount,
    unlinkedLiverCount,
    linkedAgencyCount,
    unlinkedAgencyCount,
  };
}

// ---------------------------------------------------------------------------
// 4. createRefund
// ---------------------------------------------------------------------------

export async function createRefund(params: {
  liverId: string;
  targetMonth: string;
  amountUsd: number;
  reason: string;
  monthlyReportId: string;
}): Promise<{ success: true } | { error: string }> {
  const user = await getAuthUser();
  if (!user) return { error: "認証が必要です" };

  const parsed = createRefundSchema.safeParse(params);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "入力値が不正です" };
  }

  const { liverId, targetMonth, amountUsd, reason, monthlyReportId } = parsed.data;
  const supabase = await createClient();

  // Look up the monthly_report to get the exchange rate
  const { data: report, error: reportError } = await supabase
    .from("monthly_reports")
    .select("rate")
    .eq("id", monthlyReportId)
    .single();

  if (reportError || !report) {
    return {
      error: reportError?.message ?? "月次レポートが見つかりません",
    };
  }

  const amountJpy = amountUsd * report.rate;

  // Look up the liver's agency_id
  const { data: liver, error: liverError } = await supabase
    .from("livers")
    .select("agency_id")
    .eq("id", liverId)
    .single();

  if (liverError || !liver) {
    return {
      error: liverError?.message ?? "ライバーが見つかりません",
    };
  }

  // agency_userは閲覧可能代理店のライバーのみ返金登録可能
  if (user.role !== "system_admin" && liver.agency_id) {
    const { data: viewable } = await supabase
      .from("profile_viewable_agencies")
      .select("agency_id")
      .eq("profile_id", user.id);

    const viewableIds = (viewable ?? []).map((v) => v.agency_id);
    if (!viewableIds.includes(liver.agency_id)) {
      return { error: "権限がありません" };
    }
  }

  // Insert refund record
  const { error: insertError } = await supabase.from("refunds").insert({
    liver_id: liverId,
    target_month: targetMonth,
    amount_usd: amountUsd,
    amount_jpy: amountJpy,
    reason,
    agency_id: liver.agency_id,
    monthly_report_id: monthlyReportId,
  });

  if (insertError) {
    return { error: insertError.message };
  }

  revalidatePath("/dashboard");
  return { success: true };
}

// ---------------------------------------------------------------------------
// 5. deleteRefund
// ---------------------------------------------------------------------------

export async function deleteRefund(
  refundId: string
): Promise<{ success: true } | { error: string }> {
  const user = await getAuthUser();
  if (!user) return { error: "認証が必要です" };
  if (user.role !== "system_admin") return { error: "権限がありません" };

  const supabase = await createClient();

  const { error } = await supabase
    .from("refunds")
    .update({ is_deleted: true })
    .eq("id", refundId);

  if (error) {
    return { error: error.message };
  }

  revalidatePath("/dashboard");
  return { success: true };
}

// ---------------------------------------------------------------------------
// 6. updateExchangeRate
// ---------------------------------------------------------------------------

export async function updateExchangeRate(
  monthlyReportId: string,
  newRate: number
): Promise<{ success: true } | { error: string }> {
  const user = await getAuthUser();
  if (!user) return { error: "認証が必要です" };
  if (user.role !== "system_admin") return { error: "権限がありません" };

  if (newRate <= 0) return { error: "為替レートは正の数で入力してください" };

  const supabase = await createClient();

  const { error } = await supabase.rpc("update_exchange_rate", {
    p_monthly_report_id: monthlyReportId,
    p_new_rate: newRate,
  });

  if (error) {
    return { error: error.message };
  }

  revalidatePath("/dashboard");
  return { success: true };
}
